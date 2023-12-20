/* eslint-disable no-console */
import { BookingStatus } from "@prisma/client";
import { db } from "~/database";
import { sendEmail } from "~/utils/mail.server";
import { scheduler } from "~/utils/scheduler.server";
import { schedulerKeys } from "./constants";
import {
  checkinReminderEmailContent,
  checkoutReminderEmailContent,
} from "./email-helpers";
import { scheduleNextBookingJob } from "./service.server";
import type { SchedulerData } from "./types";

/** ===== start: listens and creates chain of jobs for a given booking ===== */

export const registerBookingWorkers = () => {
  /** Check-out reminder */
  scheduler.work<SchedulerData>(
    schedulerKeys.checkoutReminder,
    async ({ data }) => {
      const booking = await db.booking.findFirst({
        where: { id: data.id },
        include: {
          custodianTeamMember: true,
          custodianUser: true,
          organization: true,
          _count: {
            select: { assets: true },
          },
        },
      });
      if (!booking) {
        console.warn(
          `booking with id ${data.id} not found in checkoutReminder worker`
        );
        return;
      }
      const email = booking.custodianUser?.email;
      if (email && booking.from && booking.to) {
        await sendEmail({
          to: email,
          subject: `Checkout reminder - shelf.nu`,
          text: checkoutReminderEmailContent({
            bookingName: booking.name,
            assetsCount: booking._count.assets,
            custodian:
              `${booking.custodianUser?.firstName} ${booking.custodianUser?.lastName}` ||
              (booking.custodianTeamMember?.name as string),
            from: booking.from.toISOString(),
            to: booking.to.toISOString(),
            bookingId: booking.id,
          }),
        }).catch((err) => {
          console.error(`failed to send checkoutReminder email`, err);
        });
      }
      //schedule the next job
      if (booking.to) {
        const when = new Date(booking.to);
        when.setHours(when.getHours() - 1);
        await scheduleNextBookingJob({
          data,
          when,
          key: schedulerKeys.checkinReminder,
        });
      }
    }
  );

  /** Check-in reminder */
  scheduler.work<SchedulerData>(
    schedulerKeys.checkinReminder,
    async ({ data }) => {
      const booking = await db.booking.findFirst({
        where: { id: data.id },
        include: {
          custodianTeamMember: true,
          custodianUser: true,
          organization: true,
        },
      });
      if (!booking) {
        console.warn(
          `booking with id ${data.id} not found in checkinReminder worker`
        );
        return;
      }
      const email = booking.custodianUser?.email;
      if (email && booking.from && booking.to) {
        await sendEmail({
          to: email,
          subject: `Checkout reminder - shelf.nu`,
          text: checkinReminderEmailContent({
            bookingName: booking.name,
            assetsCount: 0,
            custodian:
              `${booking.custodianUser?.firstName} ${booking.custodianUser?.lastName}` ||
              (booking.custodianTeamMember?.name as string),
            from: booking.from.toISOString(),
            to: booking.to.toISOString(),
            bookingId: booking.id,
          }),
        }).catch((err) => {
          console.error(`failed to send checkin reminder email`, err);
        });
      }
      //schedule the next job
      if (booking.to) {
        const when = new Date(booking.to);
        await scheduleNextBookingJob({
          data,
          when,
          key: schedulerKeys.overdueHandler,
        });
      }
    }
  );

  /** overdue handler */
  scheduler.work<SchedulerData>(
    schedulerKeys.overdueHandler,
    async ({ data }) => {
      const booking = await db.booking.update({
        where: { id: data.id, status: BookingStatus.ONGOING },
        data: { status: BookingStatus.OVERDUE },
      });
      if (!booking) {
        console.warn(
          `booking with id ${data.id} and status ${BookingStatus.ONGOING} not found in overdueHandler worker`
        );
        return;
      }

      //schedule the next job
      if (booking.to) {
        const when = new Date(booking.to);
        when.setHours(when.getHours() + 1);
        await scheduleNextBookingJob({
          data,
          when,
          key: schedulerKeys.overdueReminder,
        });
      }
    }
  );

  /** Overdue reminder */
  scheduler.work<SchedulerData>(
    schedulerKeys.overdueReminder,
    async ({ data }) => {
      const booking = await db.booking.findFirst({
        where: { id: data.id },
        include: {
          custodianTeamMember: true,
          custodianUser: true,
          organization: true,
        },
      });
      if (!booking) {
        console.warn(
          `booking with id ${data.id} not found in overdueReminder worker`
        );
        return;
      }
      if (booking.status !== BookingStatus.OVERDUE) {
        console.warn(
          `ignoring overdueReminder for booking with id ${data.id}, as its not in overdue status`
        );
        return;
      }
      const email = booking.custodianUser?.email;
      if (email) {
        await sendEmail({
          to: email,
          subject: `overdue reminder`,
          text: `you have passed the deadline for checkin out your booking ${booking.name} of ${booking.organization.name}`,
        }).catch((err) => {
          console.error(`failed to send overdue reminder email`, err);
        });
      }
    }
  );
  /** ===== end: listens and creates chain of jobs for a given booking ===== */
};
