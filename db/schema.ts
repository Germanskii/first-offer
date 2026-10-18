import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const profiles=sqliteTable('tracker_profiles',{userId:text('user_id').primaryKey(),state:text('state').notNull(),revision:integer('revision').notNull(),updatedAt:text('updated_at').notNull()});
export const searchProfiles=sqliteTable('search_profiles',{userId:text('user_id').primaryKey(),profile:text('profile').notNull(),updatedAt:text('updated_at').notNull()});
export const strategyBackups=sqliteTable('strategy_backups',{userId:text('user_id').primaryKey(),state:text('state').notNull(),revision:integer('revision').notNull(),createdAt:text('created_at').notNull()});
