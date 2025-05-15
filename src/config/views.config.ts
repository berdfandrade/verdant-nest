
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

export function configureViews(app: NestExpressApplication) {
    app.setBaseViewsDir(join(__dirname, '../../views'));
    app.setViewEngine('ejs');
}
