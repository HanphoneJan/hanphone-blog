package com.hanphone.blog.util

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

private val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.getDefault())

fun formatDate(date: Date?): String =
    date?.let { dateFormat.format(it) } ?: ""

fun formatDateTime(date: Date?): String {
    if (date == null) return ""
    return SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault()).format(date)
}