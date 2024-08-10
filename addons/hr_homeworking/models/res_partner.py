# Part of Flectra. See LICENSE file for full copyright and licensing details.

from flectra import models

class ResPartner(models.Model):
    _inherit = 'res.partner'

    def _compute_im_status(self):
        super()._compute_im_status()
        for user in self.user_ids:
            dayfield = self.env['hr.employee']._get_current_day_location_field()
            location_type = user[dayfield].location_type
            if not location_type:
                continue
            im_status = user.partner_id.im_status
            if im_status == "online" or im_status == "away" or im_status == "offline":
                user.partner_id.im_status = location_type + "_" + im_status

    def get_worklocation(self, start_date, end_date):
        employee_id = self.env['hr.employee'].search([
            ('work_contact_id', 'in', self.ids),
            ('company_id', '=', self.env.company.id)])
        return employee_id._get_worklocation(start_date, end_date)
