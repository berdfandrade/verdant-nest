import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';

const isLocalGateway = Number(process.env.LOCAL_GATEWAY) === 1;

export const GatewayCors = {
	cors: { origin: isLocalGateway ? '*' : '' },
};

export interface GatewayConfig extends OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {}