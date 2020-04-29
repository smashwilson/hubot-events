// Description:
//   Cooperatively plan events.
//
// Commands:
//   hubot event create --help - Create a new event.
//   hubot event [ABCD10] --help - View or modify an existing event.
//   hubot event delete ABCD10 - Delete an event.
//   hubot event list --help - List existing events.

const yargs = require("yargs/yargs");
const moment = require("moment-timezone");
const {Store} = require("./store");
const commands = require("./commands");

const EVENT_STORE_KEY = "hubot-events:event-store";

module.exports = function (robot) {
  robot["hubot-events"] = {
    getStore() {
      if (!this._store) {
        const payload = robot.brain.get(EVENT_STORE_KEY);
        this._store = payload
          ? Store.deserialize(robot, payload)
          : new Store(robot);
      }

      return this._store;
    },

    async withStore(cb) {
      const store = this.getStore();

      try {
        await cb(store);
      } finally {
        robot.brain.set(EVENT_STORE_KEY, store.serialize());
      }
    },

    getUserTz(msg) {
      return msg.message.user.tz || "America/New_York";
    },

    now(userTz) {
      return moment.tz(userTz);
    },
  };

  robot.respond(/event ([^]*)/i, function (msg) {
    const y = commands
      .register(
        robot,
        msg,
        yargs().usage("event [create|edit|delete|list] <args>")
      )
      .strict(true)
      .version(false)
      .wrap(null)
      .help(false)
      .showHelpOnFail(false);

    y.parse(msg.match[1], (err, argv, output) => {
      if (err) {
        msg.reply(
          `${output}\n` +
            "See https://github.com/smashwilson/hubot-plan#commands for usage and examples."
        );
        return;
      }

      if (output) {
        msg.reply(output);
      }
    });
  });
};
