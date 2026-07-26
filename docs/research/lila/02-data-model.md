# lila — Mô hình dữ liệu & quy tắc nghiệp vụ các entity trọng tâm

> Đọc [00-cleanroom-policy.md](./00-cleanroom-policy.md) trước. Mô tả bằng lời văn tiếng Việt, không chứa code Scala hay tên trường BSON nguyên văn — chỉ nêu khái niệm và quy tắc nghiệp vụ để làm cơ sở thiết kế schema PostgreSQL độc lập cho mentingo.

## 1. Clas (Lichess Classes) — mô hình lớp học gần nhất với LMS

Module `clas`. Đây là entity quan trọng nhất cho Đợt **L5**.

**Lớp (Clas)**: có tên, mô tả, một "bảng tin" nội bộ (markdown), danh sách giáo viên (một hoặc nhiều — người đầu tiên trong danh sách là chủ sở hữu), mốc thời gian tạo, mốc thời gian giáo viên xem lớp lần cuối (dùng để phát hiện lớp bị bỏ hoang và tự động lưu trữ), trạng thái lưu trữ (archived) hoặc đang hoạt động, một cờ cho phép học sinh nhắn tin lẫn nhau, và một cờ tùy chọn cho biết lớp có gắn với một "câu lạc bộ" (Team) tương ứng hay không (nếu có, câu lạc bộ đó tự động không cho ai xin gia nhập và không cho nhắn tin toàn đội — vì mọi giao tiếp đã qua kênh lớp). Giới hạn tối đa 100 học sinh mỗi lớp.

**Học sinh (Student)**: là một bản ghi liên kết một tài khoản người dùng với một lớp cụ thể (không phải bản thân tài khoản — cùng một người dùng có thể có nhiều bản ghi Student ở nhiều lớp khác nhau qua vòng đời chuyển lớp). Có: **tên thật do giáo viên nhập** (tách biệt hoàn toàn khỏi username công khai của tài khoản — đây là điểm bảo vệ quyền riêng tư trẻ em cốt lõi), ghi chú riêng của giáo viên về học sinh đó (không hiển thị cho học sinh), một cờ **"managed"** cho biết tài khoản này là do giáo viên tạo hộ (khác với học sinh tự có tài khoản rồi được mời vào lớp), mốc tạo, trạng thái lưu trữ.

Sinh mật khẩu tự động cho tài khoản managed dùng bộ ký tự đã loại bỏ các ký tự dễ nhầm lẫn khi đọc/viết tay (loại bỏ chữ `l` thường vì dễ lẫn với số `1` và chữ hoa `I`) — độ dài mặc định 7 ký tự.

**Ba cách thêm học sinh vào lớp**:

1. Giáo viên tạo tài khoản mới hộ học sinh (managed = true) — chỉ cần nhập tên thật, hệ thống tự sinh username + mật khẩu.
2. Giáo viên **nhập hàng loạt** một danh sách tên thật (mỗi dòng một tên) → tạo hàng loạt tài khoản managed cùng lúc — đây là tính năng có giá trị cao nhất cho giáo viên phụ trách lớp đông học sinh.
3. Giáo viên mời một tài khoản đã tồn tại → tạo một "lời mời" chờ học sinh chấp nhận/từ chối.

**Lời mời (ClasInvite)**: có mã định danh ngắn, gắn với 1 tài khoản + 1 lớp + tên thật do giáo viên nhập lúc mời, trạng thái chấp nhận/từ chối/đang chờ. Có một quy tắc bảo vệ trẻ em đáng chú ý: **không thể gửi lời mời qua kênh tin nhắn riêng tới một tài khoản đang ở "chế độ trẻ em"** — hệ thống trả về một phản hồi đặc biệt yêu cầu dùng kênh khác (ví dụ chia sẻ trực tiếp mã lớp) thay vì gửi tin nhắn.

**Đăng nhập nhanh theo mã lớp (ClasLogin)** — cơ chế đăng nhập tập thể đặc trưng nhất của tính năng này: giáo viên bấm một nút để "sinh mã đăng nhập" cho toàn bộ (hoặc một phần) học sinh **managed đang hoạt động** trong lớp cùng lúc. Mỗi học sinh nhận một mã ngắn (5 ký tự) duy nhất trong đợt sinh đó. Toàn bộ đợt mã **hết hạn sau 15 phút** kể từ lúc sinh. Giáo viên chiếu danh sách mã lên màn hình lớp học; học sinh nhỏ tuổi chỉ cần nhập đúng mã của mình vào một ô nhập riêng (không cần nhớ username/mật khẩu) để đăng nhập ngay. Hệ thống có cơ chế phát hiện & tránh sinh trùng mã trong cùng một đợt.

**Vòng đời tài khoản managed** (mỗi hành động là một quyết định nghiệp vụ tách biệt, giáo viên chủ động thực hiện):

- **Lưu trữ (archive)** — không xóa, chỉ ẩn khỏi danh sách hoạt động, có thể un-archive.
- **Đặt lại mật khẩu** — chỉ áp dụng được cho tài khoản managed (không áp dụng được cho tài khoản học sinh tự quản vì họ tự chịu trách nhiệm mật khẩu của mình qua email riêng).
- **Chuyển lớp (move)** — chuyển 1 học sinh managed sang một lớp khác do cùng giáo viên (hoặc giáo viên khác) phụ trách.
- **Giải phóng (release)** — bước chuyển đổi quan trọng nhất: học sinh managed nhập một địa chỉ email thật của chính mình, tài khoản chuyển từ "do giáo viên quản lý" sang "tự quản lý hoàn toàn" — mật khẩu cũ bị vô hiệu, học sinh giờ có toàn quyền như một tài khoản bình thường (đổi mật khẩu qua email, không còn phụ thuộc giáo viên).
- **Đóng tài khoản (close)** — giáo viên chủ động đóng vĩnh viễn một tài khoản managed (ghi vào nhật ký hành động dành riêng, học sinh bị đóng theo cách này có luồng kháng nghị (appeal) riêng biệt với các luồng kháng nghị do vi phạm quy định thông thường).

**Bảng tin lớp**: một trang nội dung markdown do giáo viên biên tập, hiển thị cho mọi thành viên lớp — dùng cho thông báo, bài tập về nhà dạng văn bản, ghi chú chung.

**Thông báo tới toàn lớp**: giáo viên gửi một đoạn text ngắn (10-300 ký tự) tới toàn bộ học sinh trong lớp cùng lúc, tách biệt với bảng tin (bảng tin là nội dung thường trực, thông báo là sự kiện tức thời).

**Báo cáo tiến độ lớp (ClasProgress)**: giáo viên chọn một "loại hình" (một thể loại thời gian chơi cụ thể, hoặc riêng loại "giải đố cờ") + một khoảng thời gian tính bằng ngày → hệ thống trả về, cho từng học sinh trong lớp: số ván/số đề đã chơi trong khoảng đó, số ván thắng, tổng thời lượng chơi, và **biến thiên hệ số rating** (rating đầu kỳ so với rating cuối kỳ trong đúng khoảng ngày được chọn — không phải rating hiện tại so với rating khi tạo tài khoản). Có báo cáo riêng cho tiến độ hoàn thành module nhập môn (đo bằng tỉ lệ phần trăm số cấp độ đã đạt điểm khác 0 trên tổng số cấp độ).

**Tự động lưu trữ lớp bỏ hoang**: nếu giáo viên không mở xem lớp trong một khoảng thời gian dài, hệ thống tự động chuyển lớp sang trạng thái lưu trữ (dựa trên mốc "lần xem cuối" đã nêu ở trên).

**Đồng bộ với câu lạc bộ (Team)**: nếu lớp có bật cờ "gắn với câu lạc bộ", hệ thống tự động tạo/cập nhật một câu lạc bộ tương ứng 1-1 với lớp (dùng chung định danh), câu lạc bộ này bị khóa 2 quyền: không nhận thành viên tự do xin gia nhập, không cho gửi tin nhắn toàn đội (tránh trùng lặp kênh giao tiếp với bảng tin lớp).

## 2. Study/Chapter — hạ tầng "bài giảng cờ tương tác", entity quan trọng nhất cho Đợt **L2**

**Study**: một tài liệu học tập có thể chứa nhiều "chương" (Chapter), có tên, danh sách thành viên với vai trò, một "vị trí sticky" — tức một con trỏ vị trí hiện tại (chương nào, nước nào) được **đồng bộ chung cho mọi người đang xem cùng lúc**, tùy chọn ẩn/hiện (công khai / không niêm yết / riêng tư), cấu hình phân quyền chi tiết (xem mục dưới), số lượt "thích", mô tả, chủ đề gắn thẻ, nguồn gốc (tạo từ đầu / tạo từ 1 ván đấu có sẵn / nhân bản từ study khác / sinh ra từ một buổi tường thuật giải đấu trực tiếp).

Giới hạn: tối đa 64 chương mỗi study.

**Xếp hạng độ "nổi bật"**: một công thức kết hợp số lượt thích và độ mới (thời gian tạo cộng thêm một khoảng "giờ tương đương" tính từ logarit của số lượt thích) — mô hình tương tự thuật toán xếp hạng "hot" kiểu diễn đàn cộng đồng (càng nhiều thích thì thời gian "cộng thêm" càng lớn nhưng tăng chậm dần theo logarit, không tuyến tính).

**Nhân bản (clone)**: tạo một bản sao độc lập, người nhân bản trở thành chủ sở hữu bản mới với đầy đủ quyền chỉnh sửa, bản mới mặc định ở chế độ riêng tư, và ghi nhận nguồn gốc là "nhân bản từ study X".

**Vai trò thành viên**: chỉ có hai cấp — **đọc** (xem, không sửa được) và **ghi** (sửa được nội dung/thêm chương). Chủ sở hữu là một vai trò riêng biệt, luôn có toàn quyền.

**Cấu hình phân quyền theo tính năng (Settings)** — mô hình 5 mức áp cho từng tính năng riêng biệt, đây là thiết kế phân quyền chi tiết nhất trong toàn bộ lila: 5 mức từ hẹp đến rộng là "không ai" < "chỉ chủ sở hữu" < "cộng tác viên" < "mọi thành viên" < "tất cả mọi người xem được study". Áp dụng độc lập cho 5 khía cạnh: có được dùng công cụ phân tích engine hay không, có được xem opening explorer hay không, có cho phép người khác nhân bản study này hay không, có cho phép chia sẻ/xuất nội dung ra ngoài hay không, và ai được chat trong study. Cộng thêm hai cờ riêng: có đồng bộ vị trí xem chung cho mọi người hay không (mặc định có), có hiển thị phần mô tả hay không.

**Chương (Chapter)** — đơn vị "một bài học" bên trong study: có tên, cấu hình bàn cờ ban đầu (biến thể, hướng bàn cờ, vị trí FEN khởi tạo nếu không phải từ vị trí chuẩn), một cây nước đi đầy đủ (không phải danh sách tuyến tính — có thể rẽ nhánh thành nhiều biến ở bất kỳ nước nào), các thẻ PGN chuẩn, thứ tự hiển thị trong study, chủ sở hữu riêng của chương (có thể khác chủ sở hữu study nếu là chương do người khác đóng góp), một mốc "che nước từ ply thứ mấy" (tùy chọn — dùng để biến chương thành bài đố: học sinh chỉ thấy nước đi tới một điểm nhất định, phần sau bị che cho tới khi tự tìm ra hoặc bấm "hiện đáp án"), một cờ "chế độ luyện tập" (chương này có mục tiêu để đạt được, không chỉ để xem), một cờ **"chế độ sách trò chơi" (gamebook)** — chế độ tương tác hỏi–đáp: tại mỗi nút của cây, có thể có thêm phần "gợi ý" và phần "giải thích khi đi sai" riêng biệt với bình luận thông thường, biến chương thành một bài tập tự học có phản hồi ngay khi học sinh đi nước.

Giới hạn: tối đa 3000 nút (node) trong cây nước đi của một chương.

**Trên mỗi nút của cây có thể gắn**: bình luận có ghi tên tác giả, dữ liệu riêng cho chế độ gamebook (gợi ý + giải thích), hình vẽ (mũi tên và tô màu ô — không lưu như ảnh mà lưu như dữ liệu có cấu trúc: loại hình (mũi tên/ô vuông), màu, tọa độ), ký hiệu đánh giá nước đi theo chuẩn ký hiệu cờ vua quốc tế (hay!, dở?, rất hay!!, rất dở??, đáng chú ý!?, đáng ngờ?!), thông tin đồng hồ tại thời điểm đó (nếu chương được tạo từ một ván đấu có ghi thời gian), và cờ "buộc phải đi theo biến này" (dùng cho gamebook — chặn học sinh đi lệch khỏi lộ trình dự kiến).

## 3. Practice — chuỗi bài luyện tập chính thức có mục tiêu, xây trên Study

Module `practice`. Cấu trúc: một danh sách "phần" (section, ví dụ theo chủ đề chiến thuật/khai cuộc/tàn cuộc), mỗi phần chứa nhiều "study luyện tập" (mỗi cái tương ứng 1 study thật ở mục 2, chỉ khác là được gắn vào cấu trúc luyện tập có thứ tự cố định), mỗi study luyện tập chứa nhiều chương — mỗi chương là **một bài tập cụ thể có mục tiêu rõ ràng**.

**Ghi nhận hoàn thành**: khi học sinh hoàn thành một chương, hệ thống lưu **số nước đi đã dùng để đạt mục tiêu** cho học sinh đó ở chương đó — nếu học sinh làm lại và đạt mục tiêu với **ít nước hơn** lần trước, giá trị lưu được **cập nhật xuống mức thấp hơn** (chỉ giữ giá trị tốt nhất) — cơ chế này khuyến khích tìm lời giải tối ưu thay vì chỉ hoàn thành cho có.

**Mục tiêu bài tập (được suy ra từ metadata PGN của chính chương đó, không phải một trường cấu hình riêng)**: các dạng mục tiêu gồm — đạt chiếu hết (mặc định nếu không ghi rõ dạng khác), đạt chiếu hết trong đúng N nước, đạt hòa trong N nước, đạt thế cân bằng trong N nước, đạt một mức đánh giá centipawn tối thiểu trong N nước, hoặc đạt phong cấp trong N nước.

**Tổng hợp tiến độ toàn bộ chuỗi luyện tập**: kết hợp cấu trúc (danh sách phần → study → chương) với tiến độ cá nhân → tính ra phần trăm hoàn thành tổng thể, xác định chương đầu tiên chưa hoàn thành để hiển thị "học tiếp từ đâu", và cho phép reset toàn bộ tiến độ.

## 4. Learn — nhập môn có cấp độ

Module `learn`. Cấu trúc cố định: **20 "giai đoạn" (stage)** đại diện cho các khái niệm cơ bản nhất của cờ vua theo thứ tự học tập hợp lý (đi quân theo từng loại quân riêng biệt, ăn quân, bảo vệ quân, tấn công phối hợp, chiếu tướng ở hai mức độ khó, thoát chiếu, chiếu hết, hết nước đi hòa cờ, nhập thành, bắt tốt qua đường, đòn tấn công đôi (fork), giá trị tương đối giữa các quân, thiết lập bàn cờ, và một giai đoạn tổng hợp liệt kê lại). Mỗi giai đoạn có tối đa **10 cấp độ (level)**, mỗi cấp độ học sinh nhận một điểm số (0 đến một mức trần cao). Tiến độ tổng thể của một học sinh = số cấp độ có điểm khác 0 trên tổng số cấp độ khả dụng của cả 20 giai đoạn — chỉ số này được module lớp học (Clas) gọi trực tiếp để hiển thị "% hoàn thành Learn" của mỗi học sinh trong báo cáo tiến độ lớp.

## 5. Coordinate — luyện phản xạ tọa độ bàn cờ

Module `coordinate`. Hai chế độ luyện độc lập (tìm đúng ô khi được cho tên ô / gọi đúng tên khi được chỉ vào một ô), mỗi chế độ tách riêng theo màu quân đang nhìn (từ góc nhìn quân trắng / từ góc nhìn quân đen) — tổng cộng 4 tổ hợp điểm số riêng biệt lưu cho mỗi người dùng. Chấm điểm theo số ô trả lời đúng trong một khoảng thời gian giới hạn.

## 6. Puzzle — ngân hàng bài tập chiến thuật có rating riêng, trọng tâm Đợt **L3**

Module `puzzle` (+ `storm`, `racer` cho biến thể luyện nhanh).

**Puzzle**: gồm một thế cờ khởi điểm (FEN), một chuỗi nước đi đúng duy nhất (không rẽ nhánh — nếu học sinh đi khác chuỗi này thì coi là sai, kể cả khi nước đi đó cũng dẫn tới thắng), **một hệ số rating riêng của chính puzzle đó tính theo Glicko-2** (độc lập với rating chơi ván thật của người dùng — xem mục 8), số lượt đã được giải, một tỉ lệ vote (đánh giá chất lượng puzzle của cộng đồng), và một tập hợp các "chủ đề chiến thuật" (theme) gắn thẻ.

**Danh sách chủ đề chiến thuật (~60 theme)**, chia làm các nhóm:

- **Motif chiến thuật cơ bản**: đòn đôi/chĩa hai mục tiêu (fork), ghim quân (pin), xiên quân (skewer), chiếu phát hiện (discovered check), chiếu đôi (double check), điều hướng buộc di chuyển (deflection), lôi kéo (attraction), giải phóng đường (clearance), can thiệp chắn đường (interference), tấn công xen giữa (intermezzo), tấn công xuyên chéo/dọc/ngang xa (x-ray attack), tình huống đối phương buộc phải đi nước bất lợi (zugzwang), hy sinh quân, nước đi yên tĩnh không bắt/chiếu nhưng quyết định, nước phòng thủ then chốt, quân bị treo, quân bị mắc kẹt, quân bắt được quân đang che chắn cho quân khác, tốt tiến sâu, phong cấp, phong cấp không thành hậu, bắt tốt qua đường, nhập thành, vua bị lộ, tấn công cánh vua, tấn công cánh hậu, các nước đi cùng hàng nối tiếp, kiểm tra trước khi quyết định nước đi tiếp theo.
- **Các thế chiếu hết có tên riêng (mate pattern)** — khoảng 20 kiểu chiếu hết kinh điển được đặt tên theo lịch sử cờ vua (mỗi kiểu là một cấu hình quân đặc trưng dẫn tới chiếu hết, ví dụ: chiếu hết ở góc bàn cờ, chiếu hết hàng cuối, chiếu hết bằng hai xe/hậu-xe phối hợp, chiếu hết dạng "lưỡi lê", chiếu hết bằng mã kèm hậu ("bóp cổ"), và nhiều kiểu đặt theo tên đại kiện tướng/nhà lý luận cờ vua nổi tiếng đã hệ thống hóa chúng).
- **Giai đoạn ván đấu**: khai cuộc, trung cuộc, tàn cuộc — và tàn cuộc chia nhỏ tiếp theo loại quân còn lại (tàn cuộc tượng, mã, tốt, hậu, xe, hậu-xe).
- **Độ dài lời giải**: một nước, ngắn, dài, rất dài.
- **Mục tiêu đạt được**: chỉ cần có lợi thế nhỏ, có lợi thế áp đảo, đạt thế cân bằng từ thế bất lợi.
- **Nguồn gốc ván đấu**: từ ván đấu của kỳ thủ đẳng cấp cao, giữa hai kỳ thủ đẳng cấp cao, giữa các đại kiện tướng hàng đầu thế giới.
- **Meta**: trộn ngẫu nhiên tất cả chủ đề, đã được phân loại chủ đề rõ ràng, hoặc một "hỗn hợp lành mạnh" cân bằng độ khó/chủ đề.

**Trục chọn puzzle (PuzzleAngle)**: người học có thể chọn luyện theo **một chủ đề cụ thể** hoặc theo **một khai cuộc cụ thể** — hai trục lọc độc lập, không kết hợp cùng lúc.

**Ghi nhận mỗi lần giải (PuzzleRound)**: kết quả lần gần nhất (thắng/thua), một mốc thời gian riêng ghi nhận **"lần giải lại thành công sau khi từng sai"** (cơ chế lặp lại ngắt quãng thô sơ — ưu tiên cho học sinh giải lại đúng những bài mình từng sai), mốc lần đầu chơi, vote đánh giá, và danh sách chủ đề kèm vote riêng cho từng chủ đề (**cộng đồng có thể vote thêm/bớt chủ đề cho một puzzle cụ thể** — tối đa 7 lượt "thêm chủ đề" mỗi lần giải, không giới hạn lượt "bỏ chủ đề").

**Phiên & lộ trình (PuzzleSession/PuzzlePath)**: puzzle được nhóm sẵn thành các "lộ trình" theo (trục chọn, mức bậc, khoảng rating) — khi người học đang luyện, hệ thống giữ một phiên nhớ lộ trình hiện tại + vị trí trong lộ trình + rating hiện tại; khi hết lộ trình hoặc người học đổi cấu hình lọc thì chuyển sang lộ trình mới.

**5 mức độ khó (PuzzleDifficulty)** — áp dụng như một độ lệch (delta) cộng/trừ vào rating hiện tại của người học trước khi chọn puzzle phù hợp: dễ nhất (-600), dễ hơn (-300), bình thường (0), khó hơn (+300), khó nhất (+600). Hai mức cực trị (dễ nhất/khó nhất) bị **hạn chế mức độ ảnh hưởng lên rating thật** của người học sau khi giải — tránh việc chọn mức cực đoan để "cày" rating dễ dàng.

**Giải lại các bài đã sai theo chủ đề (PuzzleReplay)**: một luồng riêng cho học sinh chủ động ôn lại đúng những puzzle mình từng làm sai trong N ngày gần nhất, lọc theo chủ đề cụ thể.

**Bảng thống kê tiến bộ cá nhân (PuzzleDashboard)** — tính năng giá trị nhất của toàn bộ hệ thống puzzle cho mục đích sư phạm:

- Với mỗi khoảng thời gian (1, 2, 3, 7, 10, 14, 21, 30, 60, 90 ngày), tính kết quả tổng thể VÀ kết quả riêng theo từng chủ đề: số bài đã làm, số bài thắng, số bài "sửa được" (từng sai, sau đó giải lại đúng), rating trung bình các puzzle đã gặp.
- Từ đó suy ra: tỉ lệ thắng ngay lần đầu, tỉ lệ thắng tổng, tỉ lệ "sửa được", và một **chỉ số hiệu suất theo chủ đề** kết hợp rating trung bình của puzzle với tỉ lệ thắng ngay lần đầu (công thức kiểu: lấy rating trung bình puzzle trừ đi một hằng số chuẩn hóa, rồi cộng thêm một phần tính theo tỉ lệ thắng lần đầu) — chỉ số này cho phép so sánh "học sinh mạnh/yếu ở chủ đề nào" một cách định lượng, không chỉ dựa vào tỉ lệ đúng/sai thô.
- **Tự động chỉ ra điểm yếu**: các chủ đề có số lần thất bại từ 3 trở lên VÀ chỉ số hiệu suất thấp hơn hiệu suất tổng thể — lấy 8 chủ đề thấp nhất.
- **Tự động chỉ ra điểm mạnh**: các chủ đề có số lần thắng ngay lần đầu từ 3 trở lên VÀ chỉ số hiệu suất cao hơn hiệu suất tổng thể — lấy 8 chủ đề cao nhất.
- Chỉ tính các chủ đề có đủ số lượng mẫu tối thiểu (một phần nhỏ so với tổng số bài đã làm) để tránh kết luận vội trên quá ít dữ liệu.

**Puzzle hằng ngày**: một puzzle được chọn cố định cho mọi người trong ngày, không cần đăng nhập vẫn giải được (có phiên bản dành cho khách).

**Storm** (giải nhanh liên tục trong thời gian giới hạn, càng đúng liên tiếp càng được combo điểm cao) và **Racer** (nhiều người cùng giải một chuỗi puzzle giống nhau, thi ai xong nhanh và đúng nhiều hơn theo thời gian thực) là hai biến thể luyện tập theo nhịp độ nhanh, dùng chung engine chọn puzzle với hệ thống chính nhưng có vòng đời phiên chơi riêng (theo ngày/theo phòng đua).

## 7. Chơi trực tuyến — trọng tâm Đợt **L4**

**Thách đấu (Challenge)**: một lời mời đấu 1-1 gửi đích danh tới một người dùng cụ thể, có thể chấp nhận/từ chối/hủy; cũng có dạng "thách đấu mở" (không nhắm ai cụ thể — bất kỳ ai theo đúng link đều nhận được) và dạng "ghép cặp hàng loạt" — giáo viên/quản trị viên gửi nhiều cặp đấu cùng lúc cho một danh sách người dùng định sẵn, rất phù hợp mô hình "cả lớp cùng vào đấu tập một lượt".

**Sảnh (Lobby)**: nơi người dùng đăng "lời mời mở" hiển thị công khai cho mọi người đang online cùng thời điểm chọn tham gia (khác thách đấu ở chỗ không nhắm người cụ thể), và cơ chế "ghép cặp nhanh theo pool" — người dùng vào một hàng đợi theo khung thời gian chơi mong muốn, hệ thống tự ghép với người khác cùng hàng đợi có rating gần nhất.

**Ván đấu (Round)**: mỗi ván có một tiến trình xử lý riêng theo dõi trạng thái sống của ván đó — nhận nước đi, cập nhật đồng hồ **do server quyết định** (không tin tưởng đồng hồ phía client, chống gian lận thời gian), xử lý đầu hàng, xử lý đề nghị hòa (cần cả hai bên đồng ý), xử lý đề nghị hoãn nước đi (takeback, cũng cần đối phương đồng ý), xử lý thêm giờ (một bên tự nguyện cộng thêm thời gian cho đối phương), xử lý tái đấu (rematch — tạo ván mới với màu quân đảo ngược), và tự động kết thúc ván khi hết giờ hoặc một bên rời đi quá lâu không quay lại.

**Ván tính hạng (rated) vs không tính hạng**: chỉ ván tính hạng mới cập nhật hệ số rating sau khi kết thúc (xem mục 8) — ván không tính hạng dùng cho luyện tập thoải mái không ảnh hưởng thứ hạng.

## 8. Hệ số rating — Glicko-2, trọng tâm Đợt **L3/L4**

Module `rating` + `perfStat` + `history`.

**Glicko-2** — mỗi người chơi có 3 tham số cho mỗi "loại hình" (perf): **rating** (giá trị trung tâm ước lượng trình độ), **độ lệch chuẩn (RD — rating deviation)** phản ánh mức độ chắc chắn của ước lượng đó (RD cao = chưa chơi đủ để biết chính xác trình độ, RD thấp = đã ổn định), và **độ biến động (volatility)** phản ánh mức độ "thất thường" trong kết quả gần đây của người chơi đó. Sau mỗi ván, cả 3 tham số của cả hai người chơi đều được cập nhật dựa trên kết quả thắng/thua/hòa, chênh lệch rating trước ván, và độ lệch chuẩn của cả hai bên. Thuật toán Glicko-2 công bố công khai (public domain) bởi Mark Glickman — được phép cài đặt lại từ đặc tả toán học gốc mà không vi phạm AGPL của lila (xem [00-cleanroom-policy.md](./00-cleanroom-policy.md)).

Có ngưỡng giá trị hợp lý (rating tối thiểu/tối đa, độ lệch chuẩn tối thiểu/tối đa) và một ngưỡng độ lệch chuẩn để một người chơi được coi là "đủ ổn định để xếp hạng công khai" (RD phải xuống dưới một mức nhất định).

**Mỗi "loại hình thời gian chơi" (perf) có bộ rating riêng biệt hoàn toàn độc lập** — chơi cờ chớp không ảnh hưởng rating cờ chậm. Ngoài các loại hình thời gian chơi thông thường, **puzzle cũng có một perf riêng** dùng đúng cơ chế Glicko-2 này (đã mô tả ở mục 6).

**Thống kê chi tiết theo từng loại hình (perfStat)**: rating cao nhất/thấp nhất từng đạt (thấp nhất chỉ tính trong 1 năm gần nhất để phản ánh đúng trình độ hiện tại), kết quả tốt nhất/tệ nhất gần đây, tổng số ván, chuỗi thắng/thua liên tiếp dài nhất, chuỗi ngày chơi liên tục dài nhất.

**Lịch sử theo ngày (history)**: mỗi ngày lưu lại giá trị rating của từng loại hình — dữ liệu nguồn để vẽ biểu đồ tiến bộ theo thời gian, và để module lớp học (Clas, mục 1) tính "biến thiên rating trong N ngày" của học sinh.

## 9. Insight/Tutor — phân tích điểm mạnh-yếu, trọng tâm Đợt **L8**

Module `insight` + `tutor`. Mô hình **Câu hỏi (chọn 1 chiều phân tích + 1 chỉ số đo + bộ lọc) → Câu trả lời**, chạy trên pipeline tổng hợp dữ liệu.

**Nguồn dữ liệu**: mỗi ván đấu (theo góc nhìn của một người chơi cụ thể) được "làm phẳng" thành một bản ghi phân tích chứa, cho từng nước đi: giai đoạn ván (khai cuộc/trung cuộc/tàn cuộc), thời gian suy nghĩ đã dùng, tỉ lệ thời gian còn lại trên đồng hồ, loại quân được di chuyển, đánh giá centipawn ngay trước nước đi đó, mức tổn thất centipawn do nước đi gây ra so với nước tốt nhất, tỉ lệ thắng ước tính, tỉ lệ chính xác của nước đi, cân bằng vật chất trên bàn tại thời điểm đó, một chỉ số "độ tỉnh táo" (có phát hiện đòn chiến thuật của đối phương kịp thời hay không), một chỉ số "may mắn" (đối phương bỏ lỡ cơ hội tốt), có bị "chớp mắt" (blur — dấu hiệu rời màn hình giữa ván, dùng cho phát hiện gian lận, nằm ngoài phạm vi port của mentingo), và hệ số biến thiên thời gian suy nghĩ.

**~24 chiều phân tích** (dimension) khả dụng để nhóm dữ liệu: theo ngày, theo giai đoạn thời gian dài hơn, theo loại hình chơi, theo giai đoạn ván, theo kết quả (thắng/hòa/thua), theo lý do kết thúc ván, theo màu quân, theo họ khai cuộc, theo biến thể khai cuộc cụ thể, theo mức chênh lệch trình độ đối thủ, theo loại quân, theo khoảng thời gian suy nghĩ, theo việc mình/đối phương có nhập thành hay không, theo việc có đổi hậu hay không, theo khoảng cân bằng vật chất, theo khoảng đánh giá centipawn, theo khoảng tỉ lệ thắng, theo khoảng độ chính xác, theo khoảng tổn thất centipawn, theo khoảng thời gian còn lại trên đồng hồ, theo có "chớp mắt" hay không, theo hệ số biến thiên thời gian, theo nguồn ván đấu.

**~19 chỉ số đo** (metric) có thể chọn để hiển thị theo mỗi chiều trên: tổn thất centipawn trung bình, độ chính xác trung bình, thời gian suy nghĩ, tỉ lệ kết quả, tỉ lệ lý do kết thúc, phân bố loại quân, cân bằng vật chất, chênh lệch rating đối thủ, số nước đi trung bình, độ tỉnh táo, may mắn, tần suất chớp mắt, biến thiên thời gian, phân nhóm theo mức tổn thất centipawn, chênh lệch rating, hiệu suất (performance rating theo từng lát cắt), tỉ lệ thời gian còn lại, tổng thời gian.

**Báo cáo tự động (Tutor)**: tổng hợp các góc nhìn trên thành một báo cáo dễ đọc theo từng loại hình chơi, chia theo các "khía cạnh" cụ thể: điểm mạnh/yếu theo khai cuộc, theo giai đoạn ván, theo loại quân, cách quản lý thời gian trên đồng hồ, xu hướng thua vì hết giờ, khả năng gỡ lại khi ở thế xấu (resourcefulness), và khả năng chuyển hóa ưu thế đang có thành chiến thắng thực sự (conversion) — đồng thời **so sánh với nhóm người chơi cùng trình độ** để chỉ ra khía cạnh nào thực sự là điểm yếu tương đối (không chỉ so với chính mình).

## 10. Team, Coach — hạ tầng cộng đồng liên quan Đợt **L9**

**Team (câu lạc bộ)**: có tên, mật khẩu tùy chọn (câu lạc bộ riêng tư yêu cầu mật khẩu để xin gia nhập), giới thiệu công khai + mô tả riêng chỉ thành viên thấy, số thành viên, trạng thái mở/đóng nhận thành viên (mở = ai cũng gia nhập được ngay, đóng = phải gửi đơn xin và chờ leader duyệt), cấu hình truy cập forum/chat riêng của câu lạc bộ, danh sách chặn (không cho một số người xin gia nhập lại), có thể ẩn danh sách thành viên.

Giới hạn: tối đa 10 người có vai trò lãnh đạo (leader) mỗi câu lạc bộ; một người dùng thường tham gia tối đa khoảng 50 câu lạc bộ (giới hạn nới rộng dần theo tuổi tài khoản, và nới rộng hơn nữa nếu tài khoản đã được xác minh).

**8 quyền hạn chi tiết cho leader** (một câu lạc bộ có thể cấp từng quyền riêng lẻ cho từng leader, không phải "tất cả hoặc không gì cả"): hiển thị công khai là leader, sửa cấu hình câu lạc bộ, tạo giải đấu riêng cho câu lạc bộ, kiểm duyệt chat/forum của câu lạc bộ, duyệt đơn xin gia nhập, nhắn tin toàn đội, đuổi thành viên, và một quyền "quản trị" bao trùm.

**Coach (danh bạ huấn luyện viên)**: hồ sơ công khai (cần được duyệt để hiển thị trong danh bạ tìm kiếm được — không phải ai cũng tự động xuất hiện), có thể bật/tắt "đang nhận học viên mới", hồ sơ gồm: tiêu đề giới thiệu, mức giá theo giờ (dạng text tự do, không phải một con số cấu trúc), mô tả, kinh nghiệm thi đấu/giảng dạy/khác, kỹ năng, phương pháp giảng dạy, video giới thiệu, danh sách study công khai làm minh họa. **Không có hệ thống đặt lịch/thanh toán tích hợp** — đây chỉ là một danh bạ hồ sơ, giao dịch thực tế diễn ra ngoài nền tảng. Hồ sơ tự động bị ẩn khỏi danh bạ nếu tài khoản bị đánh dấu vi phạm (gian lận/quấy rối).

## 11. Giải đấu — Tournament (Arena), Swiss, Simul — trọng tâm Đợt **L6**

**Tournament kiểu Arena**: ghép cặp liên tục trong suốt thời lượng giải (không theo vòng cố định) — người chơi liên tục được ghép với người khác đang chờ ngay khi ván trước kết thúc, điểm tích lũy theo từng ván thắng/hòa/thua cộng thêm điểm thưởng cho chuỗi thắng liên tiếp. Có chế độ "đấu đội" — nhiều câu lạc bộ tham gia cùng lúc, điểm của đội = tổng điểm một số lượng thành viên ghi điểm cao nhất định trong đội (không phải tất cả thành viên), có giới hạn số đội tối đa tham gia và số đội hiển thị nổi bật trên bảng xếp hạng.

**Swiss**: hệ ghép cặp theo vòng cố định (không phải liên tục như Arena) — **bắt buộc phải thuộc về một câu lạc bộ cụ thể** (khác Arena có thể tổ chức độc lập). Cho phép người chơi vào muộn miễn là chưa quá một nửa tổng số vòng đấu. Có bảng điểm kèm các chỉ số phá vỡ hòa điểm (tiebreak) theo chuẩn quốc tế, và khả năng **xuất dữ liệu theo định dạng TRF chuẩn FIDE** — định dạng file trao đổi dữ liệu giải đấu được các phần mềm ghép cặp giải đấu chính thức trên toàn thế giới công nhận, cho phép nạp kết quả vào hệ thống tính hạng FIDE thật nếu giải được tổ chức theo đúng quy chuẩn liên đoàn. Cũng hỗ trợ ghép cặp thủ công khi ban tổ chức cần can thiệp tay.

**Simul (đánh đồng loạt)**: một người chủ trì (thường là huấn luyện viên/kỳ thủ mạnh) đấu đồng thời với nhiều người tham gia khác — người tham gia đăng ký trước, chủ trì duyệt từng người, khi bắt đầu thì tạo đồng loạt các ván riêng biệt giữa chủ trì và từng người tham gia (chủ trì luân phiên đi nước ở nhiều bàn cùng lúc). Đây là mô hình đấu tập rất phù hợp bối cảnh câu lạc bộ cờ trường học: 1 giáo viên/HLV vs nhiều học sinh cùng buổi.

**Điều kiện tham gia** (dùng chung cho cả 3 loại giải trên): giới hạn theo khoảng rating, yêu cầu số ván tối thiểu đã chơi, có thể yêu cầu là thành viên một câu lạc bộ cụ thể.
