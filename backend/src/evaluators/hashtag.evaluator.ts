import { Injectable } from '@nestjs/common';
import { ConditionEvaluator } from './evaluator.interface';
import { ConditionType } from '../database/entities/campaign-condition.entity';
import { Campaign } from '../database/entities/campaign.entity';
import { Participant } from '../database/entities/participant.entity';

@Injectable()
export class HashtagEvaluator implements ConditionEvaluator {
  readonly type = ConditionType.HASHTAG;

  async evaluate(
    params: Record<string, any> | undefined,
    participant: Participant,
    campaign: Campaign,
    xApiToken?: string
  ): Promise<boolean> {
    if (participant.conditionsResult && participant.conditionsResult[this.type] !== undefined) {
      return participant.conditionsResult[this.type];
    }
    const hashtag = params?.hashtag as string || '';
    if (!hashtag) return true;

    // Simulation: 40% chance participant posted with the correct hashtag
    return Math.random() < 0.4;
  }
}
