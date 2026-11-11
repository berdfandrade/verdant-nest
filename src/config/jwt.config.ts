/*
	As configs são lidas via getters para que o valor de `process.env`
	seja resolvido em tempo de execução (depois do ConfigModule carregar o .env),
	e não no momento em que o arquivo é importado.
*/

export const JwtConfig = {
	get secret() {
		return process.env.JWT_SECRET || 'DefaultFallBackSpongeBobKey';
	},
	signOptions: { expiresIn: '1h' },
};

export const AdminJwtConfig = {
	get secret() {
		return process.env.ADMIN_JWT_SECRET || 'DefaultFallBackSpongeBobAdminKey';
	},
	signOptions: { expiresIn: '1h' },
};

export const RefreshJwtConfig = {
	get secret() {
		return process.env.REFRESH_JWT_SECRET || 'DefaultHashingSecret';
	},
	expiresIn: '10d',
};
