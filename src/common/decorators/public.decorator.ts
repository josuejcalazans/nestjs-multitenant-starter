import { SetMetadata } from '@nestjs/common';
import { PUBLIC_METADATA } from './metadata';

export const Public = () => SetMetadata(PUBLIC_METADATA, true);
