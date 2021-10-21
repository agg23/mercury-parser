import { GenericExtractor } from './generic';
import { ExtractResultOptions } from './types';
export declare const extractCommentResult: (opts: Omit<ExtractResultOptions<'comment'>, 'type'>) => ReturnType<typeof GenericExtractor['comment']>;
