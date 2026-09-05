/**
 * Mensagens entre content script, popup e service worker.
 */
(function (root) {
  const MessageType = Object.freeze({
    RUN_ACTION: 'RUN_ACTION',
    ACTION_RESULT: 'ACTION_RESULT',
    GET_AUTH_STATUS: 'GET_AUTH_STATUS',
    AUTH_STATUS: 'AUTH_STATUS',
    PAIR_WITH_CODE: 'PAIR_WITH_CODE',
    PAIR_RESULT: 'PAIR_RESULT',
    DISCONNECT: 'DISCONNECT',
    SET_API_ENV: 'SET_API_ENV',
    PING: 'PING',
  });

  root.BibliofiliaMessages = { MessageType };
})(typeof self !== 'undefined' ? self : window);
