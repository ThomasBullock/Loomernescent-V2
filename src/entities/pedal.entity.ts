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

@Entity('pedals')
export class Pedal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  brand: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ name: 'pedal_type', nullable: true })
  pedalType: string;

  @Column({ name: 'pedal_type2', nullable: true })
  pedalType2: string;

  @Column({ type: 'jsonb', name: 'used_by', nullable: true })
  usedBy: { artist: string; band: string; slug: string }[];

  @ManyToOne(() => Band, (band) => band.pedals, { nullable: true })
  @JoinColumn({ name: 'associated_band_id' })
  associatedBand: Band;

  @Column({ name: 'associated_band_id', nullable: true })
  associatedBandId: string;

  @Column('timestamp', {
    array: true,
    default: '{}',
    name: 'years_manufactured',
  })
  yearsManufactured: Date[];

  @Column({ nullable: true })
  image: string;

  @Column({ type: 'text', nullable: true })
  comments: string;

  @Column({ nullable: true })
  youtube: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Favourite, (fav) => fav.pedal)
  favourites: Favourite[];
}
