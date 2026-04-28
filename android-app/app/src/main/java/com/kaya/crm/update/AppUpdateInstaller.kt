package com.kaya.crm.update

import android.content.Context
import android.content.Intent
import androidx.core.content.FileProvider
import com.kaya.crm.BuildConfig
import com.kaya.crm.R
import java.io.File

object AppUpdateInstaller {
    fun install(context: Context, apkFile: File) {
        val uri = FileProvider.getUriForFile(
            context,
            "${BuildConfig.APPLICATION_ID}.fileprovider",
            apkFile
        )
        val intent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        if (intent.resolveActivity(context.packageManager) == null) {
            error(context.getString(R.string.update_install_no_handler))
        }
        context.startActivity(intent)
    }
}
