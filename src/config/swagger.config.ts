import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
	const config = new DocumentBuilder()
		.setTitle('Verdant API')
		.setDescription("Vedant's API")
		.setVersion('1.0')
		.addBearerAuth()
		.build();

	const document = SwaggerModule.createDocument(app, config);

	SwaggerModule.setup('api', app, document, {
		customCss: `
        /* Esconde logo e texto do Swagger */
            .topbar {
            display: none !important;
            
            }
        /* Cor de fundo opcional */
`,
		customSiteTitle: 'Verdant Api',
		customfavIcon: '/favico.svg',

	});
}
