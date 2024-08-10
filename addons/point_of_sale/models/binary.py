from flectra import http
from flectra.http import request
from flectra.addons.web.controllers.binary import Binary


class PointOfSaleBinary(Binary):
    @http.route([
        '/web/image/pos.config/<id>/<string:field>',
        '/web/image/pos.config/<id>/<string:field>/<int:width>x<int:height>'], type='http', auth="public")
    def point_of_sale_content_image(self, field='raw', **kwargs):
        if request.env.user._is_public() and field == 'iface_customer_facing_display_background_image_1920':
            request.env = request.env(su=True)
        return super().content_image(field=field, model='pos.config', **kwargs)
