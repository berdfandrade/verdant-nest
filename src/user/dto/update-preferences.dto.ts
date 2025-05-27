import { PartialType } from '@nestjs/mapped-types';
import { PreferencesDto } from './preferences.dto';

export class UpdatePreferencesDto extends PartialType(PreferencesDto) {}
