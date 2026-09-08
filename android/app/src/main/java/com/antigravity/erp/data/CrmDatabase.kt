package com.antigravity.erp.data

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
    entities = [CallEntity::class, TranscriptEntity::class],
    version = 1,
    exportSchema = false
)
abstract class CrmDatabase : RoomDatabase() {
    abstract fun callDao(): CallDao
    abstract fun transcriptDao(): TranscriptDao

    companion object {
        @Volatile
        private var INSTANCE: CrmDatabase? = null

        fun getInstance(context: Context): CrmDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    CrmDatabase::class.java,
                    "antigravity_crm.db"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
