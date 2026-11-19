import { ActivatedRouteSnapshot, BaseRouteReuseStrategy } from '@angular/router';

export class GameRouteReuse extends BaseRouteReuseStrategy {
  override shouldReuseRoute(future: ActivatedRouteSnapshot, current: ActivatedRouteSnapshot): boolean {
    if (future.data['keepGame'] && current.data['keepGame']) {
      return future.queryParamMap.get('level') === current.queryParamMap.get('level');
    }
    return super.shouldReuseRoute(future, current);
  }
}
