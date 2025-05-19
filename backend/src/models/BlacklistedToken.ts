import mongoose, { Document, Model } from 'mongoose';

export interface IBlacklistedToken extends Document {
  token: string;
  expiresAt: Date;
}

// Add static methods to the model
export interface IBlacklistedTokenModel extends Model<IBlacklistedToken> {
  isTokenBlacklisted(token: string): Promise<boolean>;
}

const blacklistedTokenSchema = new mongoose.Schema<IBlacklistedToken, IBlacklistedTokenModel>({
  token: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }, // Auto-delete the document when expiresAt is reached
  },
});

// Add a method to check if token is blacklisted
blacklistedTokenSchema.static('isTokenBlacklisted', async function(token: string): Promise<boolean> {
  const count = await this.countDocuments({ token });
  return count > 0;
});

export const BlacklistedToken = mongoose.model<IBlacklistedToken, IBlacklistedTokenModel>('BlacklistedToken', blacklistedTokenSchema);
