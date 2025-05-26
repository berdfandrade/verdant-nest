

export const JwtConfig = {
	secret: process.env.JWT_SECRET,
	signOptions: { expiresIn: '1h' },
};
