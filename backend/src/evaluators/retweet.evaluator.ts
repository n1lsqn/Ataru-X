import { Injectable } from '@nestjs/common';
import { ConditionEvaluator } from './evaluator.interface';
import { ConditionType } from '../database/entities/campaign-condition.entity';
import { Campaign } from '../database/entities/campaign.entity';
import { Participant } from '../database/entities/participant.entity';

@Injectable()
export class RetweetEvaluator implements ConditionEvaluator {
  readonly type = ConditionType.RETWEET;

  async evaluate(
    params: Record<string, any> | undefined,
    participant: Participant,
    campaign: Campaign,
    xApiToken?: string
  ): Promise<boolean> {
    if (participant.conditionsResult && participant.conditionsResult[this.type] !== undefined) {
      return participant.conditionsResult[this.type];
    }
    // Simulation logic when no real X API integrates or for demo
    return true; // Assume true if they are fetched as RT participant
  }
}
