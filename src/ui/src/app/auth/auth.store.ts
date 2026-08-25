import { Injectable, computed } from '@angular/core';
import { BEARER_TOKEN_STORAGE_KEY } from '@app/shared/config/bearerToken';
import { SignalStore } from '@app/shared/signal-store';
import { produce } from 'immer';
import { catchError, lastValueFrom, map, of, tap } from 'rxjs';
import { User } from './user';
import { RegisterDto, SigninDto } from './user.dto';

import { HttpErrorResponse } from '@angular/common/http';
import { AuthApiClient } from './auth.api-client.service';

export interface AuthState {
  user: User | null;
  status: AuthStatus;
  errorMessage: string;
}

export enum AuthStatus {
  UNAUTHORIZED,
  AUTHORIZED,
}
const authInitialState: AuthState = {
  status: AuthStatus.UNAUTHORIZED,
  user: null,
  errorMessage: '',
};

@Injectable({ providedIn: 'root' })
export class AuthStore extends SignalStore<AuthState>{
  user = this.select((state) => state.user);
  username = this.select(state => state.user?.username);
  status = this.select(state => state.status);
  errorMessage = this.select(state => state.errorMessage);

  isLoggedIn = computed(() => this.status() === AuthStatus.AUTHORIZED);
  constructor(private authApiClient: AuthApiClient) {
    super(authInitialState);
    if (localStorage.getItem(BEARER_TOKEN_STORAGE_KEY)) {
      this.refresh();
    }
  }
  signin(dto: SigninDto): Promise<boolean> {
    return lastValueFrom(this.authApiClient.signin(dto).pipe(
      tap((response) => {
        localStorage.setItem(BEARER_TOKEN_STORAGE_KEY, response.token);
        this.setUser(response);
      }),
      map(() => true),
      catchError((e) => {
        if (e instanceof HttpErrorResponse) {
          this.setErrorMessage(e.error.message);
        }
        localStorage.clear();
        return of(false);
      })));
  }
  register(dto: RegisterDto): Promise<boolean> {
    return lastValueFrom(this.authApiClient.register(dto).pipe(
      tap((response) => {
        localStorage.setItem(BEARER_TOKEN_STORAGE_KEY, response.token);
        this.setUser(response);
      }),
      map(() => true),
      catchError((e: HttpErrorResponse) => {
        console.log(e.error);
        if (e.error.code === 'P2002') {
          this.setErrorMessage(`${String(e.error.meta.target[0])} already exists.`);
        }
        return of(false);
      })));
  }
  logout(): void {
    this.reset();
  }

  clearErrorMessage(): void {
    this.setState(produce(this.state, state => { state.errorMessage = ''; }));
  }
  refresh(): void {
    this.authApiClient.refreshToken().pipe(
      tap((response) => {
        localStorage.setItem(BEARER_TOKEN_STORAGE_KEY, response.token);
        this.setUser(response);
      }),
      catchError((e) => {
        if (e instanceof HttpErrorResponse) {
          this.setErrorMessage(e.error.message);
        }
        localStorage.clear();
        return of(null);
      })
    ).subscribe();
  }
  private setErrorMessage(message: string) {
    this.setState(produce(this.state, state => {
      state.errorMessage = message;
    }));
  }
  private setUser(user: User) {
    this.setState(produce(this.state, state => {
      state.user = user;
    }));
  }
}
