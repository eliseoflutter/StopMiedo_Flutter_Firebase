package com.example.tfg_app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.util.Log;

import io.flutter.app.FlutterApplication;

public class STOPMiedo extends FlutterApplication {
    /*
    @Override
    public void onCreate() {
        Log.d("driving","onCreate() STOPMiedo.java");
        super.onCreate();
        if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel("messages",
                    "Messages",
                    NotificationManager.IMPORTANCE_LOW);
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }
    */
}
