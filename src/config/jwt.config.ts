

export const JwtConfig = {
	secret: process.env.JWT_SECRET || "DefaultFallBackSpongeBobKey",
	signOptions: { expiresIn: '1h' },
};
