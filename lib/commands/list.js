const moment = require("moment-timezone");
const {buildInvalidTimestampError} = require("../errors");
const {toInvitee, plural} = require("./helpers");
const {RobotUserSource} = require("../robot-user-source");
const {LinePresenter} = require("../line-presenter");

module.exports = {
  command: "list",

  description: "List all planned events.",

  builder(yargs) {
    return yargs
      .option("name", {
        describe:
          "Include only events with a name that matches the query (case-insensitive).",
        string: true,
      })
      .option("before", {
        describe: "Include only events before a timestamp.",
        string: true,
      })
      .option("after", {
        describe: "Include only events after a timestamp.",
        string: true,
      })
      .option("finalized", {
        describe: "Include only events that have a final date chosen.",
        boolean: true,
        default: undefined,
        conflicts: "unfinalized",
      })
      .option("unfinalized", {
        describe:
          "Include only events that have not yet had a final date chosen.",
        boolean: true,
        default: undefined,
        conflicts: "finalized",
      })
      .option("invited", {
        describe: "Include only events that have explicitly invited a user.",
        string: true,
      })
      .option("all", {
        describe: "Show all events.",
        boolean: true,
        default: undefined,
        conflicts: ["before", "after", "finalized", "unfinalized", "invited"],
      });
  },

  handler(context, argv) {
    const {store, msg, userTz, now} = context;
    const events = store.getEventStore();

    function timestamp(arg) {
      if (arg.toLowerCase().trim() === "now") return now;

      const t = moment.tz(arg, moment.ISO_8601, true, userTz);
      if (!t.isValid()) {
        throw buildInvalidTimestampError({ts: arg});
      }
      return t;
    }

    const filter = {};
    if (argv.name) filter.name = argv.name.toLowerCase();
    if (argv.before) filter.before = timestamp(argv.before);
    if (argv.after) filter.after = timestamp(argv.after);
    if (argv.finalized) filter.finalized = true;
    if (argv.unfinalized) filter.unfinalized = true;
    if (argv.invited) filter.invited = toInvitee(context, argv.invited);

    if (!argv.all && Object.keys(filter).length === 0) {
      filter.after = now;
    }

    const es = events.search(filter);
    const presenter = new LinePresenter({
      userStore: new RobotUserSource(context.robot),
    });

    msg.send(
      `_Showing ${es.size()} of ${plural(
        events.size(),
        "event"
      )}_\n${presenter.present(es)}`
    );
  },
};
