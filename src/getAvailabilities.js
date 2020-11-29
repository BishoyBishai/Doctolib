import moment from "moment";
import knex from "knexClient";

/*===================[EVENT KINDS]====================*/
const OPEN_EVENT = "opening";
const APPOINTMENT_EVENT = "appointment";

/*===================[getEventsList]====================*/
const getEventsList = async (date) => {
  return await knex
    .select("kind", "starts_at", "ends_at", "weekly_recurring")
    .from("events")
    .where(function() {
      this.where("weekly_recurring", true).orWhere("ends_at", ">", +date);
    });
};

/*===================[getInitialAvailabilities]====================*/
const getInitAvailabilities = (date) => {
  const availabilities = new Map();
  for (let i = 0; i < 7; ++i) {
    const tmpDate = moment(date).add(i, "days");
    availabilities.set(tmpDate.format("d"), {
      date: tmpDate.toDate(),
      slots: []
    });
  }
  return availabilities;
};

/*===================[getAvailabilities]====================*/

export default async function getAvailabilities(date) {
  const availabilities = getInitAvailabilities(date);
  const events = await getEventsList(date);

  for (const event of events) {
    for (
      let date = moment(event.starts_at);
      date.isBefore(event.ends_at);
      date.add(30, "minutes")
    ) {
      const day = availabilities.get(date.format("d"));
      if (event.kind === OPEN_EVENT) {
        day.slots.push(date.format("H:mm"));
      } else if (event.kind === APPOINTMENT_EVENT) {
        day.slots = day.slots.filter(
          slot => slot.indexOf(date.format("H:mm")) === -1
        );
      }
    }
  }

  return Array.from(availabilities.values())
}
