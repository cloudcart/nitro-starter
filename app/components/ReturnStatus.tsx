import {useTranslation} from '@cloudcart/nitrogen';
import type {ReturnStatus as Status} from '@cloudcart/nitrogen/storefront-api-types';
import {Badge} from '~/components/ui/Badge';

/** A return's status, as a badge in the store's language. */
export function ReturnStatus({status}: {status: Status}) {
  const {t} = useTranslation();
  return <Badge variant={status === 'RETURNED' ? 'success' : 'neutral'}>{t(`account.returnStatus.${status}`)}</Badge>;
}
