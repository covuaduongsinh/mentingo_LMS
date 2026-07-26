import { Global, Module } from "@nestjs/common";

import { ChessModule } from "src/chess/chess.module";
import { WsJwtGuard } from "src/websocket/guards/ws-jwt.guard";
import { REALTIME_PUBLISHER } from "src/websocket/realtime.publisher";
import { SocketRealtimePublisher } from "src/websocket/realtime.publisher.service";
import { WsGateway } from "src/websocket/websocket.gateway";

@Global()
@Module({
  imports: [ChessModule],
  providers: [
    WsGateway,
    WsJwtGuard,
    SocketRealtimePublisher,
    { provide: REALTIME_PUBLISHER, useExisting: SocketRealtimePublisher },
  ],
  exports: [WsGateway, WsJwtGuard, REALTIME_PUBLISHER],
})
export class WebSocketModule {}
