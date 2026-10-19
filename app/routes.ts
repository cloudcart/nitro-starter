import {flatRoutes} from '@react-router/fs-routes';
import {type RouteConfig} from '@react-router/dev/routes';

export default [
  ...(await flatRoutes()),
  // Routes defined by hand go here, alongside or instead of the files in app/routes.
  // See https://reactrouter.com/api/framework-conventions/routes.ts#routests
] satisfies RouteConfig;
