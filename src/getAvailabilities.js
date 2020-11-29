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
const getInitAvailabilities = (date, numberOfDays) => {
  const availabilities = new Map();
  for (let i = 0; i < numberOfDays; i++) {
    const tmpDate = moment(date).add(i, "days");
    availabilities.set(getDateAsKey(tmpDate), {
      date: tmpDate.toDate(),
      slots: [],
    });
  }
  return availabilities;
};

/*===================[getDateAsKey]====================
used for availabilities map to return map's key from date
*/
const getDateAsKey = (date) => moment(date).format("YYYY-MM-DD");

/*===================[getReceivedSlotKey]====================
used for receivedSlot set to return map's key from availability key and slot
*/

const getReceivedSlotKey = (key, slot) =>
  moment(`${key} ${slot}`).format("YYYY-MM-DD H:mm");


/*===================[getEventSlot]====================
returns all possible slots from the beginning of the event until the end with 30 mins between slots
*/

const getEventSlot = (event) => {
  let slots = [];
  for (
    let date = moment(event.starts_at);
    date.isBefore(event.ends_at);
    date.add(30, "minutes")
  ) {
    slots.push(date.format("h:mm"));
  }
  return slots;
};


/*===================[isSlotFree]====================
checking if state of certain slot 
*/

const isSlotFree = (receivedSlot, day, slot) => {
  const slotDate = getReceivedSlotKey(day, slot);  
  return !receivedSlot.has(slotDate);
};

/*===================[getAvailabilities]====================*/

export default async function getAvailabilities(date, numberOfDays = 7) {
  const availabilities = getInitAvailabilities(date, numberOfDays);
  const events = await getEventsList(date);
  const receivedSlot = new Set();

  /* ********** [addOpenSlots] ***********
  to add all open slots for events
  */
    
  const addOpenSlots = (event) => {
    const eventSlots = getEventSlot(event);
    
    if (event.weekly_recurring) {
      availabilities.forEach((day,key) => {        
        day.slots = eventSlots.filter((slot) =>
          isSlotFree(receivedSlot, key, slot)
        );
      });
    } else {
      const eventKey = getDateAsKey(event.starts_at);
      if (availabilities.has(eventKey)) {
        availabilities.get(eventKey).slots = eventSlots.filter((slot) =>
          isSlotFree(receivedSlot, eventKey, slot)
        );
      }
    }
  };

  /* ********** [addAppointmentSlots] ***********
  to add appointment slots and remove availability from old open slots
  */
    
  const addAppointmentSlots = (event) => {
    const eventSlots = getEventSlot(event);
    const appointmentKey = getDateAsKey(event.starts_at);
    eventSlots.map((slot) =>
      receivedSlot.add(getReceivedSlotKey(appointmentKey, slot))
    );
    if (availabilities.has(appointmentKey)) {
      availabilities.get(appointmentKey).slots = availabilities
        .get(appointmentKey)
        .slots.filter((slot) => eventSlots.indexOf(slot) === -1);
    }
  };

  events.map((event) => {
    if (event.kind === OPEN_EVENT) {
      addOpenSlots(event);
    } else if (event.kind === APPOINTMENT_EVENT) {
      addAppointmentSlots(event);
    }
  });


  return Array.from(availabilities.values())
}
