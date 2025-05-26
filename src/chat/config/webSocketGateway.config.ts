
const isLocalGateway = Number(process.env.LOCAL_GATEWAY) === 1

export const SocketGatewayConfig = {
    cors : {origin : isLocalGateway ? "*" : ""}
}