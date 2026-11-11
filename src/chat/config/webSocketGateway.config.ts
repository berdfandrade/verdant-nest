import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';

/*
	O CORS do WebSocket não fica no decorator @WebSocketGateway (lá ele seria
	lido antes do .env carregar). Ele vem de CORS_ORIGINS, aplicado pelo
	CorsIoAdapter em src/config/cors.config.ts.
*/

export interface GatewayConfig extends OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {}
