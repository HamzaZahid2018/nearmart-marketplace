import uuid
from django.conf import settings
import django.core.validators
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('users', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Shop',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('is_deleted', models.BooleanField(default=False, db_index=True)),
                ('deleted_at', models.DateTimeField(blank=True, null=True)),
                ('name', models.CharField(db_index=True, max_length=255)),
                ('slug', models.SlugField(max_length=255, unique=True)),
                ('description', models.TextField(blank=True, null=True)),
                ('category', models.CharField(db_index=True, help_text="e.g. 'Grocery', 'Pharmacy', 'Breads'", max_length=100)),
                ('image', models.CharField(blank=True, max_length=500, null=True)),
                ('rating', models.DecimalField(decimal_places=2, default=5.0, max_digits=3, validators=[django.core.validators.MinValueValidator(0.0), django.core.validators.MaxValueValidator(5.0)])),
                ('review_count', models.PositiveIntegerField(default=0)),
                ('approved', models.BooleanField(db_index=True, default=False)),
                ('verified', models.BooleanField(default=False)),
                ('revenue', models.DecimalField(decimal_places=2, default=0.0, max_digits=12, validators=[django.core.validators.MinValueValidator(0.0)])),
                ('delivery_range_km', models.DecimalField(decimal_places=2, default=5.0, max_digits=5, validators=[django.core.validators.MinValueValidator(0.0)])),
                ('latitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('longitude', models.DecimalField(blank=True, decimal_places=6, max_digits=9, null=True)),
                ('owner', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='owned_shops', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Shop',
                'verbose_name_plural': 'Shops',
                'db_table': 'nearmart_shops',
                'indexes': [
                    models.Index(fields=['approved', 'category'], name='nearmart_sh_approve_3a6a16_idx'),
                    models.Index(fields=['latitude', 'longitude'], name='nearmart_sh_latitud_8e718b_idx'),
                ],
            },
        ),
    ]
