# lila — Teardown module `clas` (Lớp học) — tài liệu tham khảo, không chứa code nguồn

> Đọc [00-cleanroom-policy.md](./00-cleanroom-policy.md) trước. Tài liệu này mô tả **hành vi nghiệp vụ, data model, và kiến trúc bằng lời** để hiểu thiết kế của module `clas` (module lớp học của lichess.org), không phải hướng dẫn copy code. Không trích dẫn mã nguồn, docstring, hay chuỗi UI nguyên văn từ lila. Đây là bản mở rộng của [02-data-model.md](./02-data-model.md) và [03-feature-matrix.md](./03-feature-matrix.md) mục E, đào sâu đúng một module để làm cơ sở viết `docs/specs/classroom-business-spec.md`.

Module nội bộ tên `clas` (viết tắt vì `class` là keyword của Scala); URL công khai `/class`. Phụ thuộc sbt: `user` + `puzzle` (khai trong `build.sbt`).

## A. Kiến trúc tổng thể

**Tầng backend logic** (một sbt module riêng): entity (`Clas`, `Student`, `ClasInvite`, `ClasLogin`), tầng API nghiệp vụ (`ClasApi` — chia 3 sub-namespace `clas`/`student`/`invite`), form validation, thao tác hàng loạt (`ClasBulk`), thống kê tiến độ (`ClasProgress`), cache "bạn cùng lớp + giáo viên" cho kid-mode messaging, hai cấu trúc lọc nhanh "user này có phải học sinh/giáo viên không" (bloom filter — không port, xem mục D.3 trong `03-feature-matrix.md`), sinh username tự động theo ngôn ngữ, mapping BSON↔entity, composition root nối toàn bộ lại + đăng ký cron tự-archive + đăng ký subscriber Bus.

**Tầng UI server-side** (scalatags): layout khung có menu trái cho giáo viên, trang giới thiệu (landing) kèm form đăng nhập nhanh bằng mã, danh sách lớp (giáo viên/học sinh), form tạo/sửa lớp, dashboard lớn nhất hệ thống (khung điều hướng 5 tab + toàn bộ nội dung từng tab của cả 2 vai giáo viên/học sinh), form thêm/sửa/mời/tạo-hàng-loạt học sinh, trang chi tiết học sinh + trang chấp nhận lời mời.

**Controller + routing**: một controller duy nhất tiếp nhận toàn bộ 41 route (khai trong file route con riêng, include vào route gốc qua cú pháp `-> /class`), cộng thêm 1 route đăng nhập-bằng-mã nằm trong controller Auth chung (không thuộc namespace `/class`).

**Frontend client-side**: 1 bundle JS nhỏ (sort bảng phía client, autocomplete tên giáo viên qua gọi API riêng, nút AJAX "sinh lại username"), 2 file style riêng (style trang lớp; widget "lớp của tôi" nhúng vào trang chủ).

**Khác**: file i18n nguồn riêng cho domain "lớp" (nằm trong hệ 43-domain i18n chung của lila, xem [01-architecture-teardown.md](./01-architecture-teardown.md) mục i18n), 2 script định nghĩa index MongoDB, khai báo dependency trong build config gốc, một module ở tầng "team" đồng bộ lớp ↔ team lichess (không port — xem mục D), và một phần nhỏ trong module "api" tự động ghi danh học sinh vào giải đấu của team-lớp (không port theo hình thức auto-join — xem mục D).

**Sơ đồ phụ thuộc (mô tả, không phải code)**:

```
HTTP → Controller lớp học ← file route con "/class"
              │
    ┌─────────┼──────────────────────────────┐
    ▼         ▼                              ▼
  UI lớp   Env (composition root)      Controller Auth
  học      (forms · api nghiệp vụ ·    (đăng nhập bằng mã,
            đăng nhập-mã · bulk ·       nằm ngoài "/class")
            markdown wall · lọc nhanh ·
            cache bạn cùng lớp ·
            sinh username)
              │
   ┌──────────┼───────────┬──────────┬────────────┬─────────┐
   ▼          ▼            ▼         ▼            ▼         ▼
 4 bảng    Module User  Module     Module tin    Module    Module
 dữ liệu   (tạo tk,     Security   nhắn (welcome/ Puzzle    Game
 lớp học   perfs,       (mật khẩu, invite/notify) (thống kê (đọc kết
           roles)       session,                  dashboard) quả để
                        email)                                tính
                                                                tiến độ)
              │
   Bus.publish(cập nhật team) ──► Module Team (đồng bộ team) — KHÔNG PORT
   Bus.subscribe(user bị xoá) ──► xử lý GDPR (ghost hoá / gỡ khỏi lớp)
   Bus.subscribe(ván đấu kết thúc) ──► ghi nhận cho thống kê tiến độ
```

Module khác (tin nhắn, team, api tổng hợp) **không phụ thuộc ngược trực tiếp** vào module lớp học — chúng giao tiếp qua một event bus nội bộ (publish/subscribe) với hợp đồng dữ liệu đặt ở module lõi dùng chung. Đây chính là mẫu thiết kế "module core + Bus" đã ghi nhận là đáng học ở [01-architecture-teardown.md](./01-architecture-teardown.md) — mentingo áp dụng bằng **outbox pattern + BullMQ** thay vì dựng một event bus riêng.

## B. Data model (đặc tả hành vi, không phải schema để copy)

Bốn loại dữ liệu chính, quan hệ 1 lớp – N giáo viên – N học sinh – N lời mời – 1 bộ mã đăng nhập hiện hành.

### B.1 Entity "Lớp"

| Khía cạnh                | Mô tả hành vi                                                                                                                                                                                                                                                                                                                                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Định danh                | Mã ngắn ngẫu nhiên, không đoán được từ tuần tự.                                                                                                                                                                                                                                                                                                                                                                       |
| Tên + mô tả              | Bắt buộc, hiển thị cho cả giáo viên lẫn học sinh. Có giới hạn độ dài (tên: khoảng chục đến trăm ký tự; mô tả: tới ~2000 ký tự) và lọc ký tự lạ.                                                                                                                                                                                                                                                                       |
| Bảng tin (wall)          | Một khối văn bản markdown duy nhất, mặc định rỗng, giới hạn rất lớn (~100.000 ký tự) — thiết kế theo kiểu "thêm tin mới lên đầu, không xóa tin cũ", có hỗ trợ nhúng số lượng giới hạn ván cờ trong markdown.                                                                                                                                                                                                          |
| Danh sách giáo viên      | Ít nhất 1, tối đa 10. **Phần tử đầu tiên đóng vai trò chủ sở hữu về mặt hiển thị** nhưng **không có đặc quyền kỹ thuật nào khác** các giáo viên còn lại trong lớp — mọi giáo viên trong danh sách có quyền ngang nhau lên mọi thao tác của lớp. Khi sửa, hệ thống tự lọc bỏ giáo viên có tài khoản đã bị khóa; nếu lọc xong danh sách rỗng thì giữ nguyên danh sách cũ (không bao giờ để lớp không có giáo viên nào). |
| Ai tạo, khi nào          | Ghi nhận người tạo + thời điểm tại lúc khởi tạo, không đổi sau đó.                                                                                                                                                                                                                                                                                                                                                    |
| Lần xem gần nhất         | Cập nhật mỗi khi một giáo viên (không phải học sinh) mở trang lớp. Đây là cơ sở duy nhất cho auto-archive — xem mục C.10.                                                                                                                                                                                                                                                                                             |
| Trạng thái archive       | Ai đóng lớp + khi nào (rỗng = đang hoạt động). Đóng là hành động **mềm**, không xóa dữ liệu, có thể mở lại bất kỳ lúc nào.                                                                                                                                                                                                                                                                                            |
| Cho phép nhắn tin nội bộ | Cờ bật/tắt — quyết định học sinh trong lớp (nếu đang ở chế độ tài khoản trẻ em) có nhắn tin được cho nhau hay không. Mặc định tắt.                                                                                                                                                                                                                                                                                    |
| Đồng bộ team             | Cờ bật/tắt tùy chọn tạo một "team" tương ứng để dùng công cụ giải đấu — **không port** (xem mục D).                                                                                                                                                                                                                                                                                                                   |
| Giới hạn cứng            | Tối đa 100 học sinh hoạt động/lớp.                                                                                                                                                                                                                                                                                                                                                                                    |

### B.2 Entity "Học sinh trong lớp" (không phải "tài khoản người dùng" — đây là quan hệ N-N giữa 1 người dùng và 1 lớp)

| Khía cạnh          | Mô tả hành vi                                                                                                                                                                                                                                                                                      |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Khóa danh định     | Ghép từ (định danh người dùng, định danh lớp) — **một người dùng chỉ có đúng một bản ghi trên mỗi lớp**, việc thêm trùng bị chặn ở tầng lưu trữ (ràng buộc duy nhất theo cặp).                                                                                                                     |
| Tên thật           | Bắt buộc, tối đa 100 ký tự, **riêng tư — chỉ giáo viên của đúng lớp đó nhìn thấy**. Tách biệt hoàn toàn khỏi tên hiển thị công khai (username) — đây là cơ chế bảo vệ quyền riêng tư trẻ em cốt lõi của toàn hệ thống: mọi nơi khác trong ứng dụng chỉ hiển thị username, không hiển thị tên thật. |
| Ghi chú            | Văn bản tự do do giáo viên viết, tối đa ~20.000 ký tự, **chỉ giáo viên của lớp đó thấy**, không hiển thị cho học sinh hay bất kỳ ai khác.                                                                                                                                                          |
| Loại tài khoản     | Cờ "được lớp quản lý" (managed) hay "tự quản" — quyết định hàng loạt hành vi khác biệt: chỉ tài khoản managed mới reset được mật khẩu qua giáo viên, mới nhận được mã đăng nhập nhanh, mới graduate/đóng được qua giáo viên.                                                                       |
| Ai thêm, khi nào   | Ghi nhận.                                                                                                                                                                                                                                                                                          |
| Trạng thái archive | Ai gỡ khỏi lớp + khi nào (rỗng = đang học). Gỡ là hành động mềm — bản ghi vẫn còn, có thể khôi phục.                                                                                                                                                                                               |

### B.3 Entity "Lời mời"

| Khía cạnh                 | Mô tả hành vi                                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Token                     | Định danh ngắn dùng làm phần của đường dẫn xem lời mời.                                                                                                                  |
| Người được mời + tên thật | Giáo viên nhập tên thật khi mời — tên này được copy thẳng sang hồ sơ học sinh nếu lời mời được chấp nhận.                                                                |
| Trạng thái                | Ba trạng thái: chờ phản hồi / đã chấp nhận / đã từ chối. **Người bị mời có thể đổi ý sau khi từ chối** (nút Accept vẫn còn khi đã decline), nhưng không thể "un-accept". |
| Chống trùng               | Một người chỉ có tối đa một lời mời đang chờ cho cùng một lớp tại một thời điểm.                                                                                         |

### B.4 Entity "Bộ mã đăng nhập nhanh" (thuộc về 1 lớp, không phải 1 học sinh)

| Khía cạnh              | Mô tả hành vi                                                                                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Phạm vi                | **Mỗi lớp chỉ có đúng một bộ mã hiệu lực tại một thời điểm** — sinh bộ mới sẽ vô hiệu hóa toàn bộ bộ cũ ngay lập tức, kể cả các mã trong bộ cũ chưa hết hạn/chưa dùng. |
| Nội dung               | Danh sách cặp (người dùng, mã) — chỉ sinh cho học sinh đang **managed và đang hoạt động** (không sinh cho học sinh đã archive hoặc tài khoản tự quản).                 |
| Hết hạn                | Cố định 15 phút kể từ lúc sinh, tự động dọn sau khi hết hạn (không cần thao tác thủ công).                                                                             |
| Độ dài & bảng ký tự mã | Ngắn (5 ký tự), lấy từ bảng ký tự đã loại bỏ các ký tự dễ nhầm lẫn khi viết tay/đọc to (số 0/1, chữ hoa O/I, chữ thường l).                                            |
| Dùng một lần           | Sau khi dùng để đăng nhập thành công, mã đó không dùng lại được nữa dù chưa hết 15 phút.                                                                               |

## C. Danh sách đầy đủ tính năng (theo nhóm)

### C.1 Onboarding & vai trò

- **Trang giới thiệu công khai** cho người chưa có vai trò gì trong hệ thống lớp học: giải thích tính năng, có ô nhập mã đăng nhập nhanh cho khách chưa đăng nhập, có nút "trở thành giáo viên" cho người đã đăng nhập.
- **Tự đăng ký làm giáo viên** — không cần admin duyệt: chỉ cần đã đăng nhập, không phải tài khoản dạng bot, không đang ở chế độ trẻ em, và (đã từng là giáo viên hoạt động HOẶC chưa từng bị quản trị viên **thu hồi** vai trò giáo viên trước đó). Vi phạm điều kiện ⇒ báo lỗi mơ hồ (không tiết lộ lý do cụ thể, tránh dò quét điều kiện). **Rào chắn lạm dụng nằm ở bước sau**, không phải ở bước cấp quyền này.
- **Trang chủ lớp học** rẽ nhánh theo vai trò: giáo viên thấy danh sách lớp mình dạy (kèm bộ đếm số lớp active/archived); học sinh thấy danh sách lớp mình học — **nếu chỉ đang học đúng 1 lớp thì tự động vào thẳng lớp đó**, bỏ qua bước chọn.
- **Menu điều hướng chính** hiện mục "Lớp học" cho: học sinh, giáo viên, người có danh hiệu thi đấu chính thức, huấn luyện viên.
- **Widget lớp trên trang chủ**: học sinh thấy tối đa vài lớp đang hoạt động ngay ở trang chủ cá nhân.

### C.2 Quản lý lớp

- **Tạo lớp**: chỉ giáo viên. Nhập tên/mô tả/danh sách giáo viên (mặc định chỉ có người tạo)/cờ cho-phép-nhắn-tin/cờ đồng-bộ-team (không port). Không giới hạn số lớp một giáo viên được tạo.
- **Sửa lớp**: chỉ giáo viên **của đúng lớp đó** (không phải giáo viên nói chung). Sửa danh sách giáo viên qua ô nhập username có gợi ý tự động (chỉ gợi ý tài khoản có vai trò giáo viên); validate mọi username phải tồn tại, không rỗng, không vượt quá 10.
- **Đóng lớp (archive) / Mở lại (reopen)**: chỉ giáo viên của lớp. Đóng là hành động mềm — dữ liệu giữ nguyên, chỉ ẩn khỏi danh sách học sinh nhìn thấy và ẩn phần lớn tab điều hướng.
- **Tự động đóng lớp bỏ hoang**: một tác vụ định kỳ (chạy mỗi giờ) quét các lớp chưa từng bị đóng và có "lần xem gần nhất" quá 30 ngày, đóng theo lô giới hạn (100 lớp/lần chạy) dưới danh nghĩa hệ thống, kèm gửi thông báo cho từng giáo viên của lớp bị đóng, giải thích lý do + cách mở lại.
- **Bảng tin lớp (wall)**: chỉ giáo viên soạn/sửa (một khối markdown, không phải nhiều bài đăng rời rạc theo kiểu blog); học sinh chỉ xem, hiển thị trong dashboard của họ (ẩn hoàn toàn nếu wall đang rỗng).
- **Gửi thông báo tới toàn bộ học sinh trong lớp** (một hành động rời, không phải sửa wall): giới hạn độ dài ngắn (khoảng 10–300 ký tự), tự động nối thêm đường dẫn tới lớp vào cuối nếu nội dung chưa chứa link đó, **chỉ khả dụng khi lớp có tối đa 100 học sinh đang hoạt động** — vượt ngưỡng thì tính năng này tắt hẳn với gợi ý "chia nhỏ lớp".

### C.3 Quản lý học sinh

- **Thêm học sinh — 3 lựa chọn song song** trên cùng một màn hình: (a) mời một tài khoản đã tồn tại sẵn trên hệ thống, (b) tạo mới một tài khoản do lớp quản lý ngay tại chỗ, (c) tạo hàng loạt tài khoản từ danh sách tên thật dán vào.
- **Mời tài khoản có sẵn**: nhập username + tên thật. Bốn kết quả có thể xảy ra, mỗi kết quả một thông báo khác nhau cho giáo viên:
  1. Người đó **từng** là học sinh của lớp này nhưng đã bị gỡ (archive) ⇒ khôi phục ngay lập tức, không cần họ chấp nhận lại.
  2. Người đó đã có lời mời đang chờ ở lớp này ⇒ báo "đã có lời mời đang chờ", không gửi trùng.
  3. Trường hợp bình thường ⇒ tạo lời mời mới, gửi tin nhắn hệ thống cho người được mời (viết bằng ngôn ngữ của chính họ, không phải ngôn ngữ giáo viên) kèm đường dẫn xem lời mời.
  4. Người được mời **đang ở chế độ tài khoản trẻ em** ⇒ **không gửi được tin nhắn tự động** (giới hạn nhắn tin của chế độ trẻ em) — lời mời vẫn được tạo, nhưng hệ thống trả về đường dẫn để giáo viên tự gửi thủ công qua kênh khác.
- **Xem & phản hồi lời mời**: chỉ đúng người được mời xem được (người khác truy cập vào token đó nhận lỗi "không tìm thấy", không phải "không có quyền" — tránh lộ thông tin). Chấp nhận tạo hồ sơ học sinh ngay; từ chối vẫn cho phép đổi ý chấp nhận sau đó.
- **Thu hồi lời mời**: chỉ giáo viên của lớp, xóa hẳn lời mời (không phải archive).
- **Tạo 1 tài khoản mới do lớp quản lý**: giáo viên nhập username mong muốn (validate duy nhất + hợp lệ) + tên thật. Hệ thống sinh một địa chỉ email nội bộ không nhận được thư thật (chỉ để thỏa ràng buộc kỹ thuật "mọi tài khoản phải có email"), sinh mật khẩu ngẫu nhiên ngắn từ bảng ký tự an toàn, **bắt buộc bật chế độ tài khoản trẻ em**, khởi tạo mức trình độ (rating) thấp hơn mặc định thông thường đáng kể (để tránh làm nhiễu hệ xếp hạng/tránh trở thành tài khoản phụ để né rating), gửi tin nhắn chào mừng, và **hiển thị mật khẩu vừa sinh đúng một lần duy nhất** trong phản hồi — kèm cảnh báo rõ ràng "sẽ không bao giờ xem lại được, hãy copy/ghi lại ngay" và cảnh báo nghiêm khắc "chỉ tạo cho học sinh thật, lạm dụng để tự tạo nhiều tài khoản có thể bị khóa".
- **Tạo hàng loạt** từ một danh sách tên thật (mỗi dòng một tên): trim + cắt độ dài + bỏ dòng rỗng + loại trùng; kiểm tra không vượt quá phần còn lại của trần 100 học sinh/lớp; sinh username tự động (không phải giáo viên gõ) theo ngôn ngữ của giáo viên, thử lại nếu trùng, có phương án dự phòng nếu bộ sinh thất bại nhiều lần; xử lý từng em tuần tự bằng đúng cơ chế "tạo 1 tài khoản" ở trên; trả về bảng kết quả (tên thật / username / mật khẩu) hiển thị một lần duy nhất.
- **Danh sách học sinh của lớp**: hiển thị đồng thời bảng lời mời đang chờ (kèm trạng thái, thời điểm, nút thu hồi) và bảng học sinh đã bị gỡ (archived).
- **Trang chi tiết một học sinh**: hiển thị hồ sơ (tên thật, ghi chú riêng của giáo viên), lối tắt nhắn tin/xem hồ sơ công khai/xem dashboard puzzle của em đó, hoạt động gần đây; nếu đã archive thì có nút khôi phục hoặc gỡ vĩnh viễn; nếu là tài khoản managed thì có thêm nhóm hành động riêng (reset mật khẩu, graduate).
- **Sửa hồ sơ học sinh**: chỉ sửa được tên thật + ghi chú (không sửa được username/mật khẩu từ đây — có endpoint riêng cho reset mật khẩu).
- **Archive / khôi phục học sinh**: gỡ mềm khỏi lớp, có thể khôi phục.
- **Reset mật khẩu** (chỉ áp dụng tài khoản managed): sinh mật khẩu ngẫu nhiên mới, **đăng xuất toàn bộ phiên đang mở** của tài khoản đó trước khi đổi, ghi log hệ thống ai-làm-cho-ai-khi-nào, hiển thị mật khẩu mới một lần.
- **Graduate / Release (trao quyền tự quản)** (chỉ tài khoản managed): học sinh/phụ huynh cung cấp một email thật của họ → hệ thống gửi email xác nhận tới địa chỉ đó → khi xác nhận xong, tài khoản chuyển hẳn sang tự quản (không managed nữa) và **không thể chuyển ngược lại thành managed được nữa**. Từ đó học sinh tự chủ hoàn toàn: tự đổi mật khẩu, tự tắt chế độ trẻ em, tự đóng tài khoản nếu muốn — **những quyền này bị khóa hoàn toàn khi còn managed**. Học sinh vẫn ở lại lớp sau khi graduate, chỉ đổi loại tài khoản.
- **Đóng vĩnh viễn tài khoản học sinh** (chỉ tài khoản managed, hoặc học sinh không-managed nhưng đã archive khỏi lớp): hành động không thể hoàn tác, yêu cầu xác nhận rõ ràng ở UI, ghi vào nhật ký kiểm duyệt vì giáo viên đang đóng tài khoản **thay** người khác (khác với người dùng tự đóng tài khoản của chính mình).
- **Chuyển học sinh sang lớp khác** (của cùng giáo viên, hoặc của một giáo viên khác cũng có mặt ở lớp đích): giữ nguyên toàn bộ hồ sơ (tên thật, ghi chú, loại tài khoản, trạng thái archive), chỉ đổi liên kết lớp và người phụ trách hiện tại.
- **Thao tác hàng loạt trên nhiều học sinh cùng lúc**: ba nhóm riêng biệt trên cùng một màn hình — (1) học sinh đang hoạt động: có thể archive hàng loạt hoặc chuyển hàng loạt sang một lớp khác; (2) học sinh đã archive: khôi phục hàng loạt hoặc xóa vĩnh viễn hàng loạt (với cảnh báo riêng nếu trong đó có tài khoản managed — xóa nghĩa là đóng tài khoản luôn); (3) lời mời đang chờ: xóa hàng loạt. Cơ chế UI đặc trưng: hiển thị sẵn danh sách toàn bộ đối tượng trong ô nhập, **giáo viên xóa bớt dòng nào muốn giữ lại**, phần còn lại trong ô mới bị tác động khi bấm nút — một cách nhập liệu nhanh cho thao tác trên diện rộng mà không cần checkbox từng dòng.

### C.4 Mã đăng nhập nhanh (không dùng mật khẩu)

- **Sinh mã**: một thao tác của giáo viên, áp dụng cho toàn bộ học sinh managed+đang hoạt động của lớp cùng lúc, tự động vô hiệu hóa bộ mã cũ nếu có.
- **Hiển thị mã**: dạng lưới thẻ (tên thật + username + mã), sắp xếp học sinh managed lên trước, kèm đồng hồ đếm ngược 15 phút — thiết kế để giáo viên **chiếu lên màn hình lớp** đầu mỗi buổi học.
- **Đăng nhập bằng mã**: endpoint công khai, không cần đăng nhập trước, có giới hạn tần suất theo IP (thiết lập cao vì cả lớp dùng chung một mạng trường học), tra cứu mã hợp lệ+chưa dùng+chưa hết hạn rồi đăng nhập thẳng vào tài khoản tương ứng — **không kiểm tra mật khẩu**, bản thân việc sở hữu mã trong 15 phút là bằng chứng ủy quyền.

### C.5 Theo dõi tiến độ

- **Báo cáo theo thể loại thời gian chơi (hoặc puzzle) × số ngày gần nhất** (nhiều mốc số ngày để chọn, từ 1 ngày tới 90 ngày): với mỗi học sinh — mức trình độ (rating) hiện tại, biến thiên rating trong khoảng thời gian đã chọn (so đầu kỳ và cuối kỳ), số ván/số bài đã chơi, số ván thắng (hoặc thời lượng chơi với ván đấu / tỉ lệ đúng với puzzle). Cộng thêm dòng tổng hợp trung bình của cả lớp. Chỉ khả dụng khi lớp ≤ 100 học sinh (cùng ràng buộc với tính năng notify).
- **Báo cáo tiến độ nhập môn** (dành cho nội dung học cơ bản/luyện tập/luyện tọa độ nếu có trong hệ thống): tỉ lệ hoàn thành theo từng học sinh cho từng mảng nội dung.

### C.6 Dashboard

- **Dashboard giáo viên**: khung điều hướng 5 tab (Tổng quan / Bảng tin / Tiến độ / Sửa lớp / Học sinh — tab "Sửa/Học sinh" ẩn khi lớp đã archive). Tab tổng quan gồm: mô tả lớp, danh sách giáo viên, liên kết tới giải đấu của lớp (nếu có), bảng tóm tắt học sinh (rating theo vài thể loại chính, số ván, số puzzle, lần hoạt động gần nhất, đánh dấu managed).
- **Dashboard học sinh**: không có khung điều hướng nhiều tab — một trang đơn giản hơn nhiều gồm: mô tả lớp, danh sách giáo viên (kèm nút thách đấu), bảng tin (wall) đã render, danh sách bạn cùng lớp kèm rating + nút "chơi cùng" (chỉ bật khi bạn đó đang trực tuyến).

### C.7 Trang cho quản trị viên hệ thống (mod/admin — khác với giáo viên)

- Xem toàn bộ lớp của một giáo viên bất kỳ (theo username).
- Xem chi tiết một lớp bất kỳ dưới góc nhìn giám sát (không phải góc nhìn giáo viên/học sinh), bao gồm cả thông tin định danh thật (email) của từng học sinh — chỉ dành cho quản trị viên có quyền hạn cao nhất liên quan tới thông tin tài khoản.
- Trong hồ sơ quản trị của một người dùng bất kỳ: nếu người đó là học sinh managed, hiện "được tạo bởi giáo viên X cho lớp Y"; nếu người đó có dạy lớp nào, hiện liên kết xem toàn bộ lớp của họ.

### C.8 Không port (đã cân nhắc — chi tiết lý do ở mục D)

Xuất token truy cập lập trình (OAuth) hàng loạt cho học sinh — phục vụ công cụ giải đấu bên thứ ba, ngoài phạm vi chương trình học của mentingo.

## D. Quyền hạn & bảo mật (mô tả nguyên lý, mentingo tự thiết kế cơ chế cụ thể)

### D.1 Nguyên lý phân quyền

- **"Giáo viên của lớp X" là quan hệ theo từng lớp**, không phải một vai trò toàn cục duy nhất — một người có thể là giáo viên ở lớp A nhưng hoàn toàn vô danh ở lớp B (kể cả khi họ có vai trò giáo viên toàn cục). Mọi thao tác sửa/quản lý một lớp cụ thể phải kiểm tra đúng quan hệ này, không chỉ kiểm tra "có vai trò giáo viên nói chung hay không".
- **"Học sinh của lớp X" cũng vậy** — quan hệ theo từng lớp, một người có thể là học sinh nhiều lớp cùng lúc.
- **"Chủ sở hữu" (giáo viên đầu danh sách) không có đặc quyền kỹ thuật** — chỉ mang tính hiển thị/lịch sử ("ai tạo lớp"). Đây là một lựa chọn thiết kế có thể cân nhắc **thắt chặt hơn** khi mentingo tự thiết kế (ví dụ: chỉ chủ sở hữu mới xóa được lớp/thêm-xóa giáo viên khác) — ghi lại làm quyết định thiết kế mở cho `docs/specs/classroom-business-spec.md`, không bắt buộc giữ nguyên như lila.
- **Luôn trả lỗi "không tìm thấy" thay vì "không có quyền"** ở mọi nơi liên quan tới sự tồn tại của một lớp/lời mời cụ thể mà người gọi không có quan hệ — tránh để kẻ tấn công dò được "lớp/lời mời này có tồn tại hay không" dựa trên sự khác biệt giữa hai loại lỗi.
- **Tự cấp vai trò giáo viên không cần duyệt**, nhưng có rào chắn chống tái phạm: một khi quản trị viên đã **chủ động thu hồi** vai trò giáo viên của ai đó (khác với việc họ tự nguyện không dùng nữa), người đó không tự đăng ký lại được — phải xin quản trị viên khôi phục thủ công.

### D.2 Ma trận quyền (tóm tắt)

| Hành động                                                 | Khách | Người dùng thường |   Học sinh của lớp X    | Giáo viên (toàn cục, không dạy lớp X) |    Giáo viên của lớp X     |                Quản trị viên                 |
| --------------------------------------------------------- | :---: | :---------------: | :---------------------: | :-----------------------------------: | :------------------------: | :------------------------------------------: |
| Xem trang giới thiệu                                      |  ✔   |        ✔         |           ✔            |                  ✔                   |             ✔             |                      ✔                      |
| Đăng nhập bằng mã lớp                                     |  ✔   |         —         |            —            |                   —                   |             —              |                      —                       |
| Tự đăng ký làm giáo viên                                  |  ✖   |        ✔¹        |           ✔¹           |                   —                   |             —              |                      ✔                      |
| Tạo lớp mới                                               |  ✖   |        ✖         |           ✖            |                  ✔                   |             ✔             |                      ✔                      |
| Xem dashboard lớp X                                       |  ✖   |        ✖         | ✔ (giao diện học sinh) |                  ✖                   |  ✔ (giao diện giáo viên)  |           ✔ (giao diện giám sát)            |
| Sửa lớp X / archive-reopen                                |  ✖   |        ✖         |           ✖            |                  ✖                   |             ✔             |                      ✖                      |
| Sửa/xem bảng tin, gửi thông báo lớp X                     |  ✖   |        ✖         |         chỉ xem         |                  ✖                   |             ✔             |                      ✖                      |
| Thêm/mời/tạo học sinh cho lớp X                           |  ✖   |        ✖         |           ✖            |                  ✖                   |             ✔             |                      ✖                      |
| Xem/sửa ghi chú riêng về học sinh lớp X                   |  ✖   |        ✖         |           ✖            |                  ✖                   |             ✔             |                      ✖                      |
| Reset mật khẩu / graduate / đóng tài khoản học sinh lớp X |  ✖   |        ✖         |           ✖            |                  ✖                   | ✔ (chỉ tài khoản managed) |       ✔ (đóng tài khoản, quyền riêng)       |
| Thao tác hàng loạt trên lớp X                             |  ✖   |        ✖         |           ✖            |                  ✖                   |             ✔             |                      ✖                      |
| Sinh/xem mã đăng nhập nhanh của lớp X                     |  ✖   |        ✖         |           ✖            |                  ✖                   |             ✔             |                      ✖                      |
| Xem báo cáo tiến độ lớp X                                 |  ✖   |        ✖         |           ✖            |                  ✖                   |             ✔             |          ✔ (quyền giám sát riêng)           |
| Xem toàn bộ lớp của một giáo viên bất kỳ                  |  ✖   |        ✖         |           ✖            |                  ✖                   |             ✖             |                      ✔                      |
| Xem thông tin định danh thật của học sinh lớp bất kỳ      |  ✖   |        ✖         |           ✖            |                  ✖                   |             ✖             | ✔ (quyền riêng, hẹp hơn quyền admin thường) |

¹ Với điều kiện ở mục D.1.

### D.3 Cơ chế chống lạm dụng (mô tả nguyên lý — mentingo chọn lọc, không port nguyên khối)

| Cơ chế                                                                                                                           | Nguyên lý                                                                                                     | Khuyến nghị cho mentingo                                                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Giới hạn cứng số học sinh/lớp                                                                                                    | Chặn cả ở tầng validate form lẫn tầng xử lý (double-guard)                                                    | **Giữ**, đọc từ cấu hình, không hardcode                                                                                                                                                       |
| Giới hạn số giáo viên/lớp                                                                                                        | Chặn ở tầng validate form                                                                                     | **Giữ**                                                                                                                                                                                        |
| Giới hạn tần suất theo IP cho đăng nhập-bằng-mã                                                                                  | Ngưỡng cao vì cả lớp dùng chung mạng trường                                                                   | **Giữ**, tái dùng hạ tầng rate-limit sẵn có                                                                                                                                                    |
| Hết hạn tự động cho mã đăng nhập                                                                                                 | Không cần dọn thủ công                                                                                        | **Giữ**                                                                                                                                                                                        |
| Chỉ mở tính năng thông báo/báo cáo tiến độ khi lớp ≤ trần học sinh                                                               | Tránh lạm dụng tính năng gửi hàng loạt làm kênh spam                                                          | **Giữ**                                                                                                                                                                                        |
| Ghi nhận số liệu tạo-tài-khoản/mời theo từng giáo viên                                                                           | Phát hiện giáo viên tạo hàng loạt tài khoản ảo bất thường                                                     | **Thay** — gộp vào hệ thống nhật ký hoạt động sẵn có của mentingo thay vì dựng hệ đo lường riêng                                                                                               |
| Ghi log hệ thống khi reset mật khẩu / tự động archive                                                                            | Truy vết trách nhiệm                                                                                          | **Giữ**, dùng nhật ký hoạt động sẵn có                                                                                                                                                         |
| Ghi vào nhật ký kiểm duyệt khi giáo viên đóng tài khoản thay học sinh                                                            | Phân biệt "tự đóng" và "bị đóng bởi người khác"                                                               | **Giữ**, dùng nhật ký kiểm duyệt sẵn có                                                                                                                                                        |
| Chặn tài khoản managed tự tắt chế độ trẻ em / tự đóng tài khoản / tự đổi mật khẩu                                                | Bảo vệ trẻ em khỏi tự ý rời khỏi giám sát của giáo viên hoặc bị người khác chiếm quyền qua chính tài khoản đó | **Giữ nguyên vẹn** — đây là bất biến bảo mật cốt lõi                                                                                                                                           |
| Chế độ trẻ em bắt buộc bật khi tạo tài khoản managed                                                                             | Mặc định an toàn                                                                                              | **Giữ**                                                                                                                                                                                        |
| Khởi tạo mức trình độ (rating) thấp hơn mặc định cho tài khoản managed                                                           | Tránh làm nhiễu hệ xếp hạng chung / tránh trở thành "tài khoản phụ"                                           | **Giữ nguyên nguyên lý**, giá trị cụ thể do mentingo tự quyết                                                                                                                                  |
| Bộ ký tự sinh mã/mật khẩu/username loại trừ ký tự dễ nhầm                                                                        | Thực dụng cho người dùng nhỏ tuổi tự đọc/chép tay                                                             | **Giữ** (mentingo đã áp dụng từ Đợt L5)                                                                                                                                                        |
| Cấu trúc dò nhanh "user này có phải học sinh/giáo viên không" mà không cần truy vấn CSDL mỗi lần                                 | Tối ưu cho hot path (kiểm tra mỗi tin nhắn/mỗi ván đấu) trên hạ tầng MongoDB không có transaction đa document | **Không port** — Postgres có index thường/partial index đủ nhanh cho quy mô 1 tenant; cấu trúc dò xấp xỉ (có tỉ lệ nhận nhầm dù rất nhỏ) cộng thêm với RLS đa tenant là rủi ro không cần thiết |
| Chặn Tor/proxy công cộng, IP blacklist khi tạo lớp/tạo tài khoản học sinh                                                        | Chống tạo tài khoản ảo hàng loạt ẩn danh ở quy mô một mạng xã hội công khai toàn cầu                          | **Không port** — mentingo không phải mục tiêu abuse ở quy mô đó; đã có rate-limit + tầng reverse proxy                                                                                         |
| Chặn tài khoản dạng bot khỏi toàn bộ tính năng lớp học                                                                           | Bot không có nhu cầu học/dạy                                                                                  | **Thay** bằng kiểm tra vai trò phù hợp, mentingo không có khái niệm tài khoản bot                                                                                                              |
| Xóa người dùng (GDPR) → ẩn danh hóa vai trò "người tạo" trong lớp, gỡ khỏi danh sách giáo viên, xóa hẳn hồ sơ học sinh liên quan | Tuân thủ quyền xóa dữ liệu cá nhân mà không phá vỡ tính toàn vẹn tham chiếu của lớp còn lại                   | **Giữ nguyên nguyên lý**, tái dùng luồng GDPR sẵn có của mentingo                                                                                                                              |

### D.4 Quy tắc hiển thị tên thật & nhắn tin cho tài khoản trẻ em

- **Tên thật chỉ hiển thị cho đúng những người có lý do nghiệp vụ**: chính chủ không thấy tên thật của mình hiển thị dưới dạng "tên thật" (họ biết tên mình); một giáo viên chỉ thấy tên thật của học sinh **mà chính họ đang dạy**; một học sinh chỉ thấy tên thật của **bạn cùng lớp** (không phải học sinh lớp khác dù cùng một giáo viên). Đây phải là **một điểm quyết định duy nhất** dùng lại ở mọi nơi hiển thị tên thật (hồ sơ, danh sách lớp, tin nhắn) — không cài rải rác nhiều nơi để tránh lệch nhau.
- **Nhắn tin giữa hai tài khoản đang ở chế độ trẻ em** chỉ được phép khi cả hai **học chung ít nhất một lớp có bật cờ cho-phép-nhắn-tin**. Nhắn tin giữa một tài khoản trẻ em và một người lớn chỉ được phép khi người lớn đó **là giáo viên của chính học sinh đó** (theo bất kỳ chiều nào — giáo viên nhắn cho học sinh, hoặc học sinh nhắn cho giáo viên). Mọi trường hợp khác bị từ chối.
- **Tìm kiếm người dùng khi đang ở chế độ trẻ em** bị giới hạn phạm vi chỉ trong tập "bạn cùng lớp + giáo viên của mình" — không tìm được người dùng bất kỳ trên toàn hệ thống.

## E. Luồng UI/UX chính (mô tả điều hướng, không phải markup cụ thể)

```
Trang chủ lớp học
 ├─ [khách] ô nhập mã đăng nhập nhanh ──► vào thẳng dashboard nếu mã hợp lệ
 ├─ [người dùng đủ điều kiện] nút "trở thành giáo viên" ──► trang chủ (giao diện giáo viên)
 ├─ [giáo viên] danh sách lớp mình dạy ──► chọn 1 lớp ──► Dashboard giáo viên
 │                └─ nút tạo lớp mới ──► form tạo ──► Dashboard giáo viên (lớp vừa tạo)
 └─ [học sinh] danh sách lớp mình học (hoặc tự vào thẳng nếu chỉ có 1 lớp) ──► Dashboard học sinh

Dashboard giáo viên (5 tab)
 ├─ Tổng quan: mô tả + giáo viên + tóm tắt học sinh
 ├─ Bảng tin: xem ──► sửa (markdown) │ gửi thông báo toàn lớp
 ├─ Tiến độ: chọn thể loại × số ngày ──► bảng chi tiết + trung bình lớp
 ├─ Sửa lớp: form sửa (kể cả danh sách giáo viên) ──► nút đóng lớp (2 bước xác nhận)
 └─ Học sinh:
     ├─ Thêm học sinh ──► 3 nhánh: Mời có sẵn │ Tạo 1 mới │ Tạo hàng loạt
     ├─ Thao tác hàng loạt (3 nhóm: hoạt động / đã gỡ / lời mời chờ)
     ├─ Sinh mã đăng nhập nhanh ──► màn hình chiếu mã (đếm ngược 15 phút)
     ├─ Bảng lời mời đang chờ ──► thu hồi
     ├─ Bảng học sinh đã gỡ ──► khôi phục
     └─ Click 1 học sinh ──► Trang chi tiết học sinh
          ├─ Sửa hồ sơ (tên thật + ghi chú)
          ├─ [managed] Reset mật khẩu (hiện mật khẩu mới, một lần)
          ├─ [managed] Graduate ──► nhập email thật ──► email xác nhận gửi ra ngoài hệ thống
          ├─ Đóng tài khoản vĩnh viễn (2 bước xác nhận, cảnh báo không thể hoàn tác)
          └─ Chuyển sang lớp khác ──► chọn 1 trong các lớp khác của giáo viên hiện tại

Dashboard học sinh (không có tab, 1 trang)
 └─ Mô tả lớp + Giáo viên (nút thách đấu) + Bảng tin (đã render) + Bạn cùng lớp (nút chơi cùng nếu đang online)

Trang xem lời mời (chỉ đúng người được mời truy cập được)
 └─ Chấp nhận ──► vào thẳng Dashboard học sinh của lớp đó
 └─ Từ chối ──► ở lại trang này, vẫn còn nút Chấp nhận để đổi ý
```

**Mẫu UI đáng giữ lại**: mọi hành động phá hủy/không thể hoàn tác (đóng lớp, đóng tài khoản, xóa hàng loạt) đều yêu cầu xác nhận 2 bước ở phía client trước khi gửi request; mật khẩu/mã sinh tự động chỉ hiển thị **đúng một lần** trong chính response của hành động sinh ra nó, không có endpoint nào khác xem lại được sau đó; bảng danh sách hỗ trợ sắp xếp phía client theo nhiều cột.

## F. Tích hợp với các hệ khác trong lila (và khuyến nghị cho mentingo)

| Hệ khác                                                             | Chiều tích hợp                                                                                                                                                                                                                                                      | Khuyến nghị mentingo                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quản lý người dùng & vai trò                                        | Lớp học → tạo tài khoản, gán vai trò, đọc/cập nhật trạng thái tài khoản                                                                                                                                                                                             | Tái dùng nguyên luồng tạo user + gán role hiện có của mentingo (đã làm ở Đợt L5)                                                                                                                                                                                                                                       |
| Xác thực & bảo mật phiên                                            | Lớp học → đăng xuất toàn bộ phiên khi reset mật khẩu; sinh/xác minh mật khẩu; gửi email xác nhận khi graduate                                                                                                                                                       | Tái dùng cơ chế phiên + email xác nhận đổi email sẵn có                                                                                                                                                                                                                                                                |
| Nhắn tin nội bộ                                                     | Lớp học → gửi tin chào mừng/mời/thông báo hàng loạt (chiều đi); Nhắn tin → hỏi ngược lớp học "hai người này có được nhắn nhau không, có tìm thấy nhau không" (chiều về, qua event bus)                                                                              | mentingo đã có `community_*` (DM, kid mode) từ Đợt L9 — mở rộng đúng 1 điểm kiểm tra "cùng lớp" thay vì viết lại toàn bộ luồng kid-mode                                                                                                                                                                                |
| Đồng bộ với "Team" + tự động ghi danh giải đấu                      | Lớp học → team: tạo/cập nhật/vô hiệu hóa team tương ứng qua event bus; Team → giải đấu: tự động ghi danh toàn bộ học sinh hoạt động vào giải đấu tạo trong team đó                                                                                                  | **Không port theo hình thức auto-sync/auto-join** — mentingo không có khái niệm Team; nhu cầu "giao lưu đấu theo lớp" đã có `chess_tournaments` (bulk pairing, Đợt L6) — thay bằng thao tác "mời hàng loạt học sinh trong lớp vào một giải đấu cụ thể", một hành động rời rạc do giáo viên chủ động bấm, không tự động |
| Thống kê ván đấu / puzzle                                           | Lớp học đọc dữ liệu ván đấu + lượt giải puzzle để tính báo cáo tiến độ; đồng thời lớp học ghi thêm một trường phụ trợ lên chính document ván đấu khi ván kết thúc, nếu người chơi là học sinh, để việc lọc theo "thể loại thời gian" khi tổng hợp báo cáo nhanh hơn | **Không port kỹ thuật denormalize lên bản ghi ván đấu** — đây là tối ưu đặc thù MongoDB (không transaction/JOIN rẻ). Trên Postgres, JOIN thẳng giữa bảng ván đấu và bảng thành viên lớp là đủ nhanh ở quy mô 1 tenant; nếu cần tối ưu thêm thì dùng materialized view thay vì thêm một cột phải giữ đồng bộ thủ công   |
| Nội dung nhập môn (Learn/Practice/Coordinate)                       | Lớp học đọc % hoàn thành theo từng học sinh cho báo cáo tiến độ nhập môn                                                                                                                                                                                            | mentingo đã có `chess_learn_progress`/`chess_practice_attempts` (Đợt L7) — gọi lại service tính toán sẵn có, không viết lại logic                                                                                                                                                                                      |
| Dashboard chuyên đề của học sinh (điểm mạnh/yếu theo chủ đề puzzle) | Lớp học chỉ tạo lối tắt điều hướng sang dashboard đó cho đúng học sinh mà giáo viên đang dạy, không tính toán lại                                                                                                                                                   | mentingo đã có `ChessPuzzleService.getDashboard` (Đợt L3) — gọi lại, không viết lại                                                                                                                                                                                                                                    |
| Xuất token truy cập lập trình (OAuth)                               | Lớp học → sinh/tìm token cá nhân cho từng học sinh, phục vụ công cụ bên thứ ba của trường                                                                                                                                                                           | **Không port** — ngoài phạm vi chương trình học                                                                                                                                                                                                                                                                        |
| Hồ sơ quản trị (mod zone)                                           | Hệ quản trị đọc ngược thông tin lớp học của một người dùng để hiển thị trong trang hồ sơ nội bộ dành cho quản trị viên                                                                                                                                              | mentingo có `super-admin`/`support-mode` sẵn — bổ sung 1 phần hiển thị tương tự, không dựng trang mới                                                                                                                                                                                                                  |
| Tuân thủ xóa dữ liệu cá nhân (GDPR)                                 | Hệ quản lý người dùng phát sự kiện "người dùng bị xóa" → lớp học lắng nghe để ẩn danh hóa/gỡ khỏi các cấu trúc liên quan                                                                                                                                            | mentingo đã có `docs/specs/gdpr-user-data-business-spec.md` — đăng ký thêm 1 handler, tái dùng luồng outbox/event sẵn có thay vì Bus riêng                                                                                                                                                                             |

### F.1 Những điều lila KHÔNG có trong module lớp học (khác kỳ vọng phổ biến của một LMS)

Giao bài tập cụ thể (chỉ có xem thống kê, không có "giao bài puzzle X cho lớp Y"); gắn bài giảng tương tác (study) vào lớp; điểm danh; lịch học/thời khóa biểu; chấm điểm/sổ điểm; chat nhóm hoặc forum riêng cho lớp (ngay cả team-của-lớp cũng tắt hẳn chat và forum theo thiết kế); upload tài liệu; kênh thông báo đẩy (chỉ có tin nhắn nội bộ, không có notification stream); xuất báo cáo PDF/Excel; phân quyền chi tiết khác nhau giữa các giáo viên cùng một lớp (mọi giáo viên trong danh sách quyền ngang nhau); nhật ký thay đổi/audit trail của riêng lớp học (chỉ có nhật ký kiểm duyệt chung ở mức hệ thống cho vài hành động nhạy cảm).

Đây là căn cứ để `docs/specs/classroom-business-spec.md` xác định rõ ranh giới: phần **"nối lớp với khóa học/bài tập/chứng chỉ"** mà mentingo dự định thêm (đã chốt trong kế hoạch triển khai) là phần **mở rộng có chủ đích ngoài phạm vi lila**, không phải phần "còn thiếu do khảo sát sót" — cần đặc tả độc lập, không suy diễn từ hành vi lila.

## G. Giấy phép

Xác nhận lại từ [00-cleanroom-policy.md](./00-cleanroom-policy.md): `D:\code\lila\LICENSE` là **GNU AGPL-3.0-or-later**; `D:\code\lila\COPYING.md` xác nhận toàn bộ code (`app/`, `modules/` — bao gồm module `clas` mô tả trong tài liệu này) thuộc diện đó. mentingo là **MIT**, vận hành SaaS đa tenant — AGPL §13 áp dụng đầy đủ. Tài liệu này là **ranh giới clean-room**: được viết sau khi đọc code lila để mô tả hành vi bằng lời, không trích dẫn mã nguồn/chuỗi UI/cấu trúc migration của lila. Người/agent viết code cho `docs/specs/classroom-business-spec.md` và các đợt C1–C8 làm việc **từ tài liệu này**, không mở lại `D:\code\lila` — đúng nguyên tắc mục 7 của chính sách clean-room.
