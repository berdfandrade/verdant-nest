import { PartialType } from '@nestjs/mapped-types';
import { AboutDto } from './about.dto';

export class UpdateAboutDto extends PartialType(AboutDto) {}
