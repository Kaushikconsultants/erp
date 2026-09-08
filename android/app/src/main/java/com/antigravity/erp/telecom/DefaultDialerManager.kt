package com.antigravity.erp.telecom

import android.app.Activity
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telecom.TelecomManager

class DefaultDialerManager(private val context: Context) {

    companion object {
        const val REQUEST_CODE_DEFAULT_DIALER = 2024
    }

    private val telecomManager: TelecomManager? by lazy {
        context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
    }

    private val roleManager: RoleManager? by lazy {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            context.getSystemService(Context.ROLE_SERVICE) as? RoleManager
        } else null
    }

    /**
     * Checks if Antigravity is currently the device's Default Phone/Dialer app
     */
    fun isDefaultDialer(): Boolean {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && roleManager != null) {
                roleManager?.isRoleHeld(RoleManager.ROLE_DIALER) == true
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && telecomManager != null) {
                context.packageName == telecomManager?.defaultDialerPackage
            } else {
                false
            }
        } catch (e: Exception) {
            false
        }
    }

    /**
     * Requests user to make our application the Default Dialer via official Android dialog
     */
    fun requestDefaultDialerRole(activity: Activity) {
        try {
            if (isDefaultDialer()) return

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && roleManager != null) {
                if (roleManager?.isRoleAvailable(RoleManager.ROLE_DIALER) == true) {
                    val intent = roleManager!!.createRequestRoleIntent(RoleManager.ROLE_DIALER)
                    activity.startActivityForResult(intent, REQUEST_CODE_DEFAULT_DIALER)
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val intent = Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER)
                intent.putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, activity.packageName)
                activity.startActivityForResult(intent, REQUEST_CODE_DEFAULT_DIALER)
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
