import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../auth';

// The top bar of every signed-in page. A page can replace the logo with its own content (the
// workspace shows its breadcrumb there) and add buttons next to the account menu (headerActions).
@Component({
  imports: [MatButtonModule, MatIconModule, MatMenuModule, RouterLink],
  selector: 'app-header',
  styleUrl: './app-header.css',
  templateUrl: './app-header.html',
})
export class AppHeader {
  private readonly router = inject(Router);
  protected readonly auth = inject(Auth);

  // Goes to /login whether or not the request succeeds: Auth clears the local session either way.
  protected logout(): void {
    const toLogin = () => this.router.navigate(['/login']);
    this.auth.logout().subscribe({ complete: toLogin, error: toLogin });
  }
}
