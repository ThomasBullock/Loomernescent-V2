import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Band } from './band.entity';
import { Favourite } from './favourite.entity';

@Entity('albums')
export class Album {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: 'timestamp', name: 'release_date', nullable: true })
  releaseDate: Date;

  @Column()
  artist: string;

  @ManyToOne(() => Band, (band) => band.albums)
  @JoinColumn({ name: 'band_id' })
  band: Band;

  @Column({ name: 'band_id' })
  bandId: string;

  @Column({ nullable: true })
  cover: string;

  @Column('text', { array: true, default: '{}' })
  producer: string[];

  @Column('text', { array: true, default: '{}' })
  engineer: string[];

  @Column('text', { array: true, default: '{}', name: 'mixed_by' })
  mixedBy: string[];

  @Column({ nullable: true })
  label: string;

  @Column('text', { array: true, default: '{}' })
  tracks: string[];

  @Column({ name: 'spotify_url', nullable: true })
  spotifyUrl: string;

  @Column({ name: 'bandcamp_url', nullable: true })
  bandcampUrl: string;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Favourite, (fav) => fav.album)
  favourites: Favourite[];
}
