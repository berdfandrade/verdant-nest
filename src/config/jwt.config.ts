

export const JwtConfig = {
	secret: process.env.JWT_SECRET || "DefaultFallBackSpongeBobKey",
	signOptions: { expiresIn: '1h' },
};

export const AdminJwtConfig = {
	secret: process.env.ADMIN_JWT_SECRET || "DefaultFallBackSpongeBobAdminKey",
	signOptions: { expiresIn: '1h' },
}