import { Entity, Column, PrimaryColumn } from 'typeorm';

@Entity('revoked_tokens')
export class RevokedToken {
  @PrimaryColumn()
  jti: string; 

  @Column({ type: 'timestamp' })
  expiresAt: Date;
}