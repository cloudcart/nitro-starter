/**
 * Paypercut's browser script for CloudCart Pay's Apple Pay and Google Pay buttons (`WalletButtons`). A `.client`
 * module: React Router leaves it out of the server's build, so the script never reaches the worker (T-619).
 */
export {Paypercut} from '@cloudcart/nitrogen/cloudcart-pay/sdk';
