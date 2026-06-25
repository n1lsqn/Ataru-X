import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TwitterApi, UserV2, TweetV2 } from 'twitter-api-v2';

export interface XUser {
  id: string;
  username: string;
  name: string;
  profileImageUrl: string;
}

export interface XInteraction {
  user: XUser;
  retweeted: boolean;
  liked: boolean;
  replied: boolean;
  quoted: boolean;
  replyText?: string;
}

@Injectable()
export class XApiService {
  private readonly logger = new Logger(XApiService.name);
  private readonly client?: TwitterApi;

  constructor(private readonly config: ConfigService) {
    const appKey = this.config.get<string>('X_API_KEY');
    const appSecret = this.config.get<string>('X_API_KEY_SECRET');
    const accessToken = this.config.get<string>('X_ACCESS_TOKEN');
    const accessSecret = this.config.get<string>('X_ACCESS_TOKEN_SECRET');
    const bearerToken = this.config.get<string>('X_BEARER_TOKEN');

    if (appKey && appSecret && accessToken && accessSecret) {
      this.client = new TwitterApi({
        appKey,
        appSecret,
        accessToken,
        accessSecret,
      });
      this.logger.log('X API Client initialized with OAuth 1.0a User Context.');
    } else if (bearerToken) {
      this.client = new TwitterApi(bearerToken);
      this.logger.log('X API Client initialized with Bearer Token.');
    } else {
      this.logger.warn('X credentials are not defined. X API calls will fall back to simulation mode.');
    }
  }

  isSimulationMode(): boolean {
    return !this.client;
  }

  // Fetch author user ID of a tweet/post
  async getTweetAuthorId(tweetId: string): Promise<string> {
    if (this.isSimulationMode()) {
      return '123456789'; // Default mock owner/author ID
    }
    try {
      const tweetResult = await this.client!.v2.singleTweet(tweetId, {
        'tweet.fields': ['author_id'],
      });
      return tweetResult.data.author_id || '123456789';
    } catch (e) {
      this.logger.error(`Error fetching author ID for tweet ${tweetId}:`, e);
      return '123456789';
    }
  }

  // Fetch users who retweeted a tweet
  async getRetweeters(tweetId: string): Promise<XUser[]> {
    if (this.isSimulationMode()) {
      return this.getMockXUsers('rt', 60);
    }

    try {
      const users: UserV2[] = [];
      let nextToken: string | undefined = undefined;

      do {
        const res: any = await this.client!.v2.tweetRetweetedBy(tweetId, {
          'user.fields': ['profile_image_url'],
          max_results: 100,
          pagination_token: nextToken,
        });

        if (res.data && res.data.length > 0) {
          users.push(...res.data);
        }

        nextToken = res.meta?.next_token;
      } while (nextToken && users.length < 1000);

      return users.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        profileImageUrl: u.profile_image_url || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png',
      }));
    } catch (e) {
      this.logger.error(`Error fetching retweeters for tweet ${tweetId}:`, e);
      throw e;
    }
  }

  // Fetch users who liked a tweet
  async getLikingUsers(tweetId: string): Promise<XUser[]> {
    if (this.isSimulationMode()) {
      return this.getMockXUsers('like', 50);
    }

    try {
      const users: UserV2[] = [];
      let nextToken: string | undefined = undefined;

      do {
        const res: any = await this.client!.v2.tweetLikedBy(tweetId, {
          'user.fields': ['profile_image_url'],
          max_results: 100,
          pagination_token: nextToken,
        });

        if (res.data && res.data.length > 0) {
          users.push(...res.data);
        }

        nextToken = res.meta?.next_token;
      } while (nextToken && users.length < 1000);

      return users.map(u => ({
        id: u.id,
        username: u.username,
        name: u.name,
        profileImageUrl: u.profile_image_url || 'https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png',
      }));
    } catch (e) {
      this.logger.error(`Error fetching liking users for tweet ${tweetId}:`, e);
      throw e;
    }
  }

  // Check if target user follows source user (Deprecated: use getFollowerIds for batch check)
  async checkFollow(targetXUserId: string, sourceXUserId: string): Promise<boolean> {
    const followers = await this.getFollowerIds(sourceXUserId);
    return followers.has(targetXUserId);
  }

  // Fetch all follower IDs of a user using pagination
  async getFollowerIds(sourceXUserId: string): Promise<Set<string>> {
    const followerIds = new Set<string>();
    if (this.isSimulationMode()) {
      // Return dummy followers
      for (let i = 0; i < 100; i++) {
        const xUserId = (100000000 + i).toString();
        if (i % 5 !== 0) {
          followerIds.add(xUserId);
        }
      }
      return followerIds;
    }

    try {
      let nextToken: string | undefined = undefined;
      do {
        const res: any = await this.client!.v2.followers(sourceXUserId, {
          max_results: 1000,
          pagination_token: nextToken,
        });
        const followers: UserV2[] = res.data || [];
        followers.forEach(f => followerIds.add(f.id));
        nextToken = res.meta?.next_token;
      } while (nextToken);
      return followerIds;
    } catch (e) {
      this.logger.error(`Error fetching followers for ${sourceXUserId}:`, e);
      return followerIds;
    }
  }

  // Fetch replies and quotes
  async getRepliesAndQuotes(tweetId: string): Promise<{ replies: Array<{ userId: string; text: string }>; quotes: string[] }> {
    if (this.isSimulationMode()) {
      return {
        replies: [
          { userId: '100000000', text: 'キャンペーンに応募します！ にる' },
          { userId: '100000001', text: '当たりますように！ にる' },
          { userId: '100000002', text: 'よろしくお願いします！ にる' },
          { userId: '100000003', text: '楽しみです！ にる' },
        ],
        quotes: ['100000000', '100000001', '100000004'],
      };
    }

    try {
      const query = `conversation_id:${tweetId}`;
      const searchResult = await this.client!.v2.search(query, {
        'tweet.fields': ['author_id', 'referenced_tweets'],
        max_results: 100,
      });

      const tweets: TweetV2[] = searchResult.tweets || [];
      const replies: Array<{ userId: string; text: string }> = [];
      const quotes: string[] = [];

      for (const tweet of tweets) {
        if (tweet.referenced_tweets) {
          const isReply = tweet.referenced_tweets.some(r => r.type === 'replied_to');
          const isQuote = tweet.referenced_tweets.some(r => r.type === 'quoted');

          if (isReply && tweet.author_id) {
            replies.push({ userId: tweet.author_id, text: tweet.text });
          }
          if (isQuote && tweet.author_id) {
            quotes.push(tweet.author_id);
          }
        }
      }

      return { replies, quotes };
    } catch (e) {
      this.logger.error(`Error searching replies/quotes for tweet ${tweetId}:`, e);
      return { replies: [], quotes: [] };
    }
  }

  // Helper mock user generator
  private getMockXUsers(prefix: string, count: number): XUser[] {
    const users: XUser[] = [];
    const names = ['Alice', 'Bob', 'Charlie', 'Diana', 'Ethan', 'Fiona', 'George', 'Hannah', 'Ian', 'Julia'];
    for (let i = 0; i < count; i++) {
      const idx = i % names.length;
      const xUserId = (100000000 + i).toString();
      users.push({
        id: xUserId,
        username: `${names[idx].toLowerCase()}_dev${i}`,
        name: `${names[idx]} Tester ${i}`,
        profileImageUrl: `https://api.dicebear.com/7.x/identicon/svg?seed=${prefix}${i}`,
      });
    }
    return users;
  }
}
