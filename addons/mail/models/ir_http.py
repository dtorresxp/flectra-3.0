# Part of Flectra. See LICENSE file for full copyright and licensing details.

import flectra
from flectra import models
from flectra.http import request


class IrHttp(models.AbstractModel):
    _inherit = 'ir.http'

    def session_info(self):
        user = self.env.user
        result = super(IrHttp, self).session_info()
        if self.env.user._is_internal():
            result['notification_type'] = user.notification_type
        guest = self.env['mail.guest']._get_guest_from_context()
        if not request.session.uid and guest:
            user_context = {'lang': guest.lang}
            mods = flectra.conf.server_wide_modules or []
            lang = user_context.get("lang")
            translation_hash = self.env['ir.http'].sudo().get_web_translations_hash(mods, lang)
            result['cache_hashes']['translations'] = translation_hash
            result.update({
                'name': guest.name,
                'user_context': user_context,
            })
        return result
