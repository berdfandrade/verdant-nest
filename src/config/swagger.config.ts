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

            

        /* Adiciona seu próprio logo */
        .topbar {
            content: '';
            display: inline-block;
            background-image: url('/logo.png') !important; 
            background-repeat: no-repeat;
            background-size: contain;
            width: 120px;
            height: 40px;
            margin-left: 10px;
        }

        /* Cor de fundo opcional */
`,
		customSiteTitle: 'Verdant Api',
		customfavIcon: '/favicon.svg',

	});
}
