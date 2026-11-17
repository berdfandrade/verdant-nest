// Chave da presença no Redis: existe enquanto o usuário tem um socket do chat conectado
export const onlineKey = (userId: string) => `online:${userId}`;
