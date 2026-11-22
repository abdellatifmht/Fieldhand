document
  .querySelector('#shadow')
  .attachShadow({ mode: 'open' })
  .appendChild(
    Object.assign(document.createElement('input'), {
      type: 'email',
      id: 'shadow-email',
    }),
  );
