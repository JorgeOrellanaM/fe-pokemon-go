<template>
  <q-card flat bordered class="full-height" aria-hidden="true">
    <q-card-section class="row items-center no-wrap">
      <q-skeleton type="rect" width="96px" height="96px" />
      <div class="col q-ml-md">
        <q-skeleton type="text" width="30%" />
        <q-skeleton type="text" class="text-h6" width="70%" />
        <q-skeleton type="text" width="50%" />
      </div>
    </q-card-section>
    <q-separator />
    <q-card-section>
      <q-skeleton type="text" width="25%" />
      <q-skeleton type="text" width="35%" />
      <div class="row q-gutter-xs q-mt-xs">
        <q-skeleton type="QChip" width="80px" />
        <q-skeleton type="QChip" width="110px" />
      </div>
    </q-card-section>
  </q-card>
</template>
