"use server"

import prisma from "@/lib/prisma"
import { auth } from "@/auth"
import { dbErrorMessage } from "@/lib/errors"

export async function getNotifications(limit = 20) {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: session.user.id, isRead: false },
      }),
    ])

    return { success: true, notifications, unreadCount }
  } catch (error) {
    return { success: false, message: dbErrorMessage(error), notifications: [], unreadCount: 0 }
  }
}

export async function markNotificationRead(id: string) {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    await prisma.notification.updateMany({
      where: { id, userId: session.user.id },
      data: { isRead: true },
    })

    return { success: true }
  } catch (error) {
    return { success: false, message: dbErrorMessage(error) }
  }
}

export async function markAllNotificationsRead() {
  try {
    const session = await auth()
    if (!session?.user) throw new Error("Unauthorized")

    await prisma.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    })

    return { success: true }
  } catch (error) {
    return { success: false, message: dbErrorMessage(error) }
  }
}
