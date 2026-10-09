<template>
  <div class="row q-col-gutter-md" aria-hidden="true">
    <div class="col-12 col-md-5">
      <q-card flat bordered class="full-height">
        <q-card-section class="column items-center q-gutter-y-sm">
          <q-skeleton type="rect" width="240px" height="240px" class="skeleton-image" />
          <q-skeleton type="text" width="60px" />
          <q-skeleton type="text" class="text-h4" width="180px" />
          <q-skeleton type="text" width="120px" />
          <div class="row q-gutter-xs">
            <q-skeleton type="QChip" width="70px" />
            <q-skeleton type="QChip" width="70px" />
          </div>
          <div class="full-width">
            <q-skeleton type="text" width="40%" />
            <q-skeleton type="text" />
            <q-skeleton type="text" width="80%" />
          </div>
        </q-card-section>
      </q-card>
    </div>
    <div class="col-12 col-md-7">
      <q-card flat bordered class="full-height">
        <q-card-section>
          <q-skeleton type="text" class="text-h6 q-mb-md" width="30%" />
          <div v-for="n in 6" :key="n" class="row items-center no-wrap q-mb-sm">
            <q-skeleton type="text" width="110px" class="q-mr-md" />
            <q-skeleton type="rect" height="10px" class="col" />
          </div>
        </q-card-section>
      </q-card>
    </div>
    <div class="col-12">
      <q-card flat bordered>
        <q-card-section>
          <q-skeleton type="text" class="text-h6 q-mb-md" width="25%" />
          <div class="row items-center q-gutter-sm">
            <q-skeleton type="rect" width="120px" height="56px" />
            <q-skeleton type="rect" width="120px" height="56px" />
            <q-skeleton type="rect" width="120px" height="56px" />
          </div>
        </q-card-section>
      </q-card>
    </div>
  </div>
</template>

<style scoped>
.skeleton-image {
  max-width: 100%;
}
</style>
