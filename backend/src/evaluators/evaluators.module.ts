import { Module } from '@nestjs/common';
import { EvaluatorFactory } from './evaluator.factory';
import { RetweetEvaluator } from './retweet.evaluator';
import { FollowEvaluator } from './follow.evaluator';
import { LikeEvaluator } from './like.evaluator';
import { ReplyEvaluator } from './reply.evaluator';
import { QuoteEvaluator } from './quote.evaluator';
import { HashtagEvaluator } from './hashtag.evaluator';
import { KeywordReplyEvaluator } from './keyword-reply.evaluator';

@Module({
  providers: [
    RetweetEvaluator,
    FollowEvaluator,
    LikeEvaluator,
    ReplyEvaluator,
    QuoteEvaluator,
    HashtagEvaluator,
    KeywordReplyEvaluator,
    EvaluatorFactory,
  ],
  exports: [EvaluatorFactory],
})
export class EvaluatorsModule {}
