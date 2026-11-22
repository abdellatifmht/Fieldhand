import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { createApp, ref } from 'vue';
import '@angular/compiler';
import { Component, provideZonelessChangeDetection } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

function ReactForm() {
  const [email, setEmail] = React.useState('');
  return React.createElement(
    'label',
    null,
    'React Email',
    React.createElement('input', {
      type: 'email',
      id: 'react-email',
      value: email,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        setEmail(event.target.value),
    }),
    React.createElement('output', { id: 'react-state' }, email),
  );
}
createRoot(document.getElementById('react')!).render(
  React.createElement(ReactForm),
);
createApp({
  setup: () => ({ email: ref('') }),
  template:
    '<label>Vue Email<input id="vue-email" type="email" v-model="email"><output id="vue-state">{{ email }}</output></label>',
}).mount('#vue');
class AngularForm {
  email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });
}
Component({
  selector: 'fieldhand-angular',
  standalone: true,
  imports: [ReactiveFormsModule],
  template:
    '<label>Angular Email<input id="angular-email" type="email" [formControl]="email"><output id="angular-state">{{ email.value }}</output><output id="angular-valid">{{ email.valid }}</output></label>',
})(AngularForm);
void bootstrapApplication(AngularForm, {
  providers: [provideZonelessChangeDetection()],
});
