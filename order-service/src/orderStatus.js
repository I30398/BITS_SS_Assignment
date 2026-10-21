// Order lifecycle state machine.
const TRANSITIONS = {
  PLACED: ['ACCEPTED', 'CANCELLED'],
  ACCEPTED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['OUT_FOR_DELIVERY'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

const STATUSES = Object.keys(TRANSITIONS);

function canTransition(from, to) {
  return (TRANSITIONS[from] || []).includes(to);
}

module.exports = { TRANSITIONS, STATUSES, canTransition };
