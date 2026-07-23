import { IsArray, IsString } from 'class-validator';

export class AnalyzeProviderResponseModel {
  @IsString()
  sentiment!: string;

  @IsArray()
  @IsString({ each: true })
  keywords!: string[];
}
